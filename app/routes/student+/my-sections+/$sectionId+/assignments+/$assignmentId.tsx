import { Button, Card, LoadingOverlay, Text, Textarea } from "@mantine/core";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { format } from "date-fns";
import * as mime from "mime-types";
import * as React from "react";
import { badRequest } from "remix-utils";
import { toast } from "sonner";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { getUniqueS3Key } from "~/models/s3-utils.client";
import { getS3Url } from "~/models/s3-utils.server";
import { requireUserId } from "~/session.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

const submitAssignmentSchema = z.object({
	textContent: z.string().optional(),
	key: z.string().optional(),
	bucket: z.string().optional(),
	extension: z.string().optional(),
	region: z.string().optional(),
});

export async function loader({ params, request }: LoaderArgs) {
	const userId = await requireUserId(request);
	
	const { sectionId, assignmentId } = params;

	if (!sectionId || !assignmentId) {
		return redirect("/student/my-sections");
	}

	const enrollment = await prisma.enrollment.findUnique({
		where: {
			studentId_sectionId: {
				studentId: userId,
				sectionId: sectionId,
			},
		},
	});

	if (!enrollment) {
		return redirect("/student/my-sections");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: {
			section: {
				include: {
					course: true,
				},
			},
			submissions: {
				where: {
					studentId: userId,
				},
			},
		},
	});

	if (!assignment) {
		return redirect(`/student/my-sections/${sectionId}`);
	}

	if (assignment.section.id !== sectionId) {
		return redirect(`/student/my-sections/${sectionId}`);
	}

	// Generate signed URLs for any files
	let assignmentFileUrl;
	if (assignment.fileKey) {
		assignmentFileUrl = await getS3Url(assignment.fileKey, {
			bucket: assignment.fileBucket!,
			region: assignment.fileRegion!,
		});
	}

	let submissionFileUrl;
	if (assignment.submissions[0]?.fileKey) {
		submissionFileUrl = await getS3Url(assignment.submissions[0].fileKey, {
			bucket: assignment.submissions[0].fileBucket!,
			region: assignment.submissions[0].fileRegion!,
		});
	}

	return json({ 
		assignment,
		assignmentFileUrl,
		submissionFileUrl
	});
}

interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof submitAssignmentSchema>;
}

export async function action({ request, params }: ActionArgs) {
	const userId = await requireUserId(request);

	const { assignmentId, sectionId } = params;

	if (!assignmentId || !sectionId) {
		return redirect("/student/my-sections");
	}

	const enrollment = await prisma.enrollment.findUnique({
		where: {
			studentId_sectionId: {
				studentId: userId,
				sectionId: sectionId,
			},
		},
	});

	if (!enrollment) {
		return redirect("/student/my-sections");
	}

	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		select: { sectionId: true },
	});

	if (!assignment || assignment.sectionId !== sectionId) {
		return redirect(`/student/my-sections/${sectionId}`);
	}

	const { fields, fieldErrors } = await validateAction(
		request,
		submitAssignmentSchema
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	const existingSubmission = await prisma.submission.findUnique({
		where: {
			assignmentId_studentId: {
				assignmentId,
				studentId: userId,
			},
		},
	});

	if (existingSubmission) {
		return badRequest<ActionData>({
			success: false,
			fieldErrors: {
				textContent: "You have already submitted this assignment",
			},
		});
	}

	await prisma.submission.create({
		data: {
			textContent: fields.textContent,
			fileKey: fields.key,
			fileName: fields.key ? fields.key.split("/").pop() : undefined,
			fileExtension: fields.extension,
			fileBucket: fields.bucket,
			fileRegion: fields.region,
			assignment: {
				connect: {
					id: assignmentId,
				},
			},
			student: {
				connect: {
					id: userId,
				},
			},
		},
	});

	return json<ActionData>({ success: true });
}

export default function AssignmentView() {
	const { assignment, assignmentFileUrl, submissionFileUrl } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<ActionData>();
	const [file, setFile] = React.useState<File | null>(null);
	const [isFileUploading, setIsFileUploading] = React.useState(false);

	const hasSubmission = assignment.submissions.length > 0;
	const submission = assignment.submissions[0];
	const isOverdue = new Date(assignment.deadline) < new Date();

	const uploadedFileKey = React.useMemo(() => {
		if (!file) return null;
		const extension = mime.extension(file.type);
		return getUniqueS3Key(file.name, extension ? `.${extension}` : undefined);
	}, [file]);

	const handleFileUpload = React.useCallback(async () => {
		if (!file || !uploadedFileKey) return;

		setIsFileUploading(true);
		try {
			const data = await axios.get<{ signedUrl: string }>(
				`/resources/upload-s3-object?key=${uploadedFileKey}`,
			);

			const uploadUrl = data.data.signedUrl;
			const response = await axios.put(uploadUrl, file);

			if (response.status === 200) {
				toast.success("Assignment file uploaded successfully");
			} else {
				toast.error("Error uploading assignment file");
			}
		} catch (error) {
			toast.error("Error uploading file");
		} finally {
			setIsFileUploading(false);
		}
	}, [file, uploadedFileKey]);

	React.useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.success && assignment.type === "FILE") {
			handleFileUpload();
		}
	}, [fetcher.data, fetcher.state, handleFileUpload, assignment.type]);

	return (
		<div className="min-h-screen p-4 relative">
			<LoadingOverlay visible={isFileUploading} />

			<PageHeading
				title={assignment.title}
				subtitle={`${assignment.section.course.name} - ${assignment.section.name}`}
				showBackButton
				to={`/student/my-sections/${assignment.section.id}`}
			/>

			<Card className="mt-4">
				<Text size="lg" weight={500}>
					Assignment Details
				</Text>
				<div className="mt-2 space-y-2">
					<Text>
						<strong>Type:</strong> {assignment.type}
					</Text>
					<Text>
						<strong>Deadline:</strong>{" "}
						{format(new Date(assignment.deadline), "PPp")}
						{isOverdue && <span className="ml-2 text-red-500">(Overdue)</span>}
					</Text>
					<Text>
						<strong>Description:</strong> {assignment.description}
					</Text>
					{assignment.type === "TEXT" && (
						<Text>
							<strong>Content:</strong> {assignment.textContent}
						</Text>
					)}
					{assignment.type === "FILE" && assignment.fileKey && (
						<div className="flex items-center gap-2">
							<Text>
								<strong>File:</strong> {assignment.fileName}
							</Text>
							<Button
								variant="light"
								size="xs"
								component="a"
								href={assignmentFileUrl}
								target="_blank"
								download
							>
								Download
							</Button>
						</div>
					)}
				</div>
			</Card>

			{hasSubmission ? (
				<Card className="mt-4">
					<Text size="lg" weight={500}>
						Your Submission
					</Text>
					<div className="mt-2 space-y-2">
						<Text>
							<strong>Submitted:</strong>{" "}
							{format(new Date(submission.createdAt), "PPp")}
						</Text>
						{submission.grade && (
							<Text>
								<strong>Grade:</strong> {submission.grade}%
							</Text>
						)}
						{submission.feedback && (
							<Text>
								<strong>Feedback:</strong> {submission.feedback}
							</Text>
						)}
						{submission.textContent && (
							<Text>
								<strong>Your Answer:</strong> {submission.textContent}
							</Text>
						)}
						{submission.fileKey && (
							<div className="flex items-center gap-2">
								<Text>
									<strong>Your File:</strong> {submission.fileName}
								</Text>
								<Button
									variant="light"
									size="xs"
									component="a"
									href={submissionFileUrl}
									target="_blank"
									download
								>
									Download
								</Button>
							</div>
						)}
					</div>
				</Card>
			) : (
				<Card className="mt-4">
					<Text size="lg" weight={500} className="mb-4">
						Submit Assignment
					</Text>
					<fetcher.Form
						method="post"
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);

							if (assignment.type === "FILE" && file && uploadedFileKey) {
								const extension = mime.extension(file.type);
								formData.append("bucket", window.ENV.AWS_BUCKET);
								formData.append("key", uploadedFileKey);
								formData.append("extension", extension || "");
								formData.append("region", window.ENV.AWS_REGION);
							}

							fetcher.submit(formData, { method: "POST" });
						}}
					>
						{assignment.type === "TEXT" ? (
							<Textarea
								name="textContent"
								label="Your Answer"
								placeholder="Type your answer here"
								required
								minRows={5}
							/>
						) : (
							<div className="border flex flex-col rounded-md p-4">
								<input
									type="file"
									onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
									required
								/>
							</div>
						)}

						<Button
							type="submit"
							variant="filled"
							color="gray"
							disabled={assignment.type === "FILE" && !file}
						>
							Submit Assignment
						</Button>
					</fetcher.Form>
				</Card>
			)}
		</div>
	);
}
