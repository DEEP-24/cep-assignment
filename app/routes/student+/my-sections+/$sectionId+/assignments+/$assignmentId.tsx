import { 
    Button, 
    Card, 
    LoadingOverlay, 
    Text, 
    Textarea,
    Badge,
    Group,
    Divider,
    Box
} from "@mantine/core";
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
		<div className="min-h-screen p-4 relative max-w-5xl mx-auto">
			<LoadingOverlay visible={isFileUploading} />

			<PageHeading
				title={assignment.title}
				subtitle={`${assignment.section.course.name} - ${assignment.section.name}`}
				showBackButton
				to={`/student/my-sections/${assignment.section.id}`}
			/>

			<div className="mt-6 grid gap-6">
				<Card shadow="sm" p="lg" radius="md" withBorder>
					<Group position="apart" mb="md">
						<Text size="lg" weight={600} color="blue">
							Assignment Details
						</Text>
						<Badge 
							size="lg"
							color={isOverdue ? "red" : "green"}
							variant="outline"
						>
							{isOverdue ? "Overdue" : "Open"}
						</Badge>
					</Group>
					<Divider mb="md" />
					<div className="grid gap-4">
						<Box>
							<Text size="sm" color="dimmed">Type</Text>
							<Text weight={500}>{assignment.type}</Text>
						</Box>
						<Box>
							<Text size="sm" color="dimmed">Deadline</Text>
							<Text weight={500}>{format(new Date(assignment.deadline), "PPp")}</Text>
						</Box>
						<Box>
							<Text size="sm" color="dimmed">Description</Text>
							<Text>{assignment.description}</Text>
						</Box>
						{assignment.type === "TEXT" && (
							<Box>
								<Text size="sm" color="dimmed">Content</Text>
								<Text>{assignment.textContent}</Text>
							</Box>
						)}
						{assignment.type === "FILE" && assignment.fileKey && (
							<Box>
								<Text size="sm" color="dimmed">Assignment File</Text>
								<Group spacing="xs">
									<Text weight={500}>{assignment.fileName}</Text>
									<Button
										variant="light"
										size="xs"
										component="a"
										href={assignmentFileUrl}
										target="_blank"
										download
										leftIcon={<span>📎</span>}
									>
										Download
									</Button>
								</Group>
							</Box>
						)}
					</div>
				</Card>

				{hasSubmission ? (
					<Card shadow="sm" p="lg" radius="md" withBorder>
						<Group position="apart" mb="md">
							<Text size="lg" weight={600} color="blue">
								Your Submission
							</Text>
							<Badge 
								size="lg"
								color={submission.grade ? "green" : "yellow"}
								variant="outline"
							>
								{submission.grade ? `Grade: ${submission.grade}%` : "Not Graded"}
							</Badge>
						</Group>
						<Divider mb="md" />
						<div className="space-y-4">
							<Box>
								<Text size="sm" color="dimmed">Submitted At</Text>
								<Text weight={500}>{format(new Date(submission.createdAt), "PPp")}</Text>
							</Box>
							
							{submission.feedback && (
								<Box>
									<Text size="sm" color="dimmed">Feedback</Text>
									<Card withBorder p="sm" radius="sm">
										<Text>{submission.feedback}</Text>
									</Card>
								</Box>
							)}

							<Box>
								<Text size="sm" color="dimmed">Your Submission</Text>
								{submission.textContent ? (
									<Card withBorder p="sm" radius="sm">
										<Text>{submission.textContent}</Text>
									</Card>
								) : submission.fileKey ? (
									<Button
										variant="light"
										component="a"
										href={submissionFileUrl}
										target="_blank"
										download
										leftIcon={<span>📎</span>}
									>
										Download Your Submission
									</Button>
								) : (
									<Text color="dimmed" italic>No submission content</Text>
								)}
							</Box>
						</div>
					</Card>
				) : (
					<Card shadow="sm" p="lg" radius="md" withBorder>
						<Text size="lg" weight={600} color="blue" mb="md">
							Submit Assignment
						</Text>
						<Divider mb="md" />
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
								<Box>
									<Text size="sm" color="dimmed" mb={2}>Your Answer</Text>
									<Textarea
										name="textContent"
										placeholder="Type your answer here"
										required
										minRows={5}
										styles={{
											input: {
												backgroundColor: 'var(--mantine-color-gray-0)',
											},
										}}
									/>
								</Box>
							) : (
								<Box>
									<Text size="sm" color="dimmed" mb={2}>Your File</Text>
									<Card withBorder p="md" radius="sm">
										<input
											type="file"
											onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
											required
											className="w-full"
										/>
									</Card>
								</Box>
							)}

							<Group position="right" mt="xl">
								<Button
									type="submit"
									size="md"
									color="blue"
									loading={fetcher.state === "submitting"}
									disabled={assignment.type === "FILE" && !file}
								>
									Submit Assignment
								</Button>
							</Group>
						</fetcher.Form>
					</Card>
				)}
			</div>
		</div>
	);
}
