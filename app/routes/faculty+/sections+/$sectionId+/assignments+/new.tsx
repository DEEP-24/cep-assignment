import {
	Button,
	LoadingOverlay,
	Radio,
	TextInput,
	Textarea,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
	useFetcher,
	useLoaderData,
	useNavigate,
	useParams,
} from "@remix-run/react";
import axios from "axios";
import * as mime from "mime-types";
import * as React from "react";
import { badRequest } from "remix-utils";
import { toast } from "sonner";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { getUniqueS3Key } from "~/models/s3-utils.client";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

const createAssignmentSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters long"),
	description: z.string().min(1, "Description is required"),
	type: z.enum(["TEXT", "FILE"]),
	deadline: z.string().min(1, "Deadline is required"),
	textContent: z.string().optional(),
	// File related fields (optional based on type)
	key: z.string().optional(),
	bucket: z.string().optional(),
	extension: z.string().optional(),
	region: z.string().optional(),
});

export async function loader({ params }: LoaderArgs) {
	const { sectionId } = params;

	if (!sectionId) {
		return redirect("/faculty/sections");
	}

	const section = await prisma.section.findUnique({
		where: { id: sectionId },
		include: {
			course: true,
			faculty: true,
		},
	});

	if (!section) {
		return redirect("/faculty/sections");
	}

	return json({ section });
}

interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof createAssignmentSchema>;
}

export async function action({ request, params }: ActionArgs) {
	const { sectionId } = params;
	const { fields, fieldErrors } = await validateAction(
		request,
		createAssignmentSchema,
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	if (!sectionId) {
		return redirect("/faculty/sections");
	}

	await prisma.assignment.create({
		data: {
			title: fields.title,
			description: fields.description,
			type: fields.type,
			deadline: new Date(fields.deadline),
			textContent: fields.type === "TEXT" ? fields.textContent : undefined,
			fileKey: fields.type === "FILE" ? fields.key : undefined,
			fileName: fields.type === "FILE" ? fields.title : undefined,
			fileExtension: fields.type === "FILE" ? fields.extension : undefined,
			fileBucket: fields.type === "FILE" ? fields.bucket : undefined,
			fileRegion: fields.type === "FILE" ? fields.region : undefined,
			section: {
				connect: {
					id: sectionId,
				},
			},
		},
	});

	return json<ActionData>({ success: true });
}

export default function CreateAssignment() {
	const { sectionId } = useParams();
	const { section } = useLoaderData<typeof loader>();
	const [assignmentType, setAssignmentType] = React.useState<"TEXT" | "FILE">(
		"TEXT",
	);
	const [file, setFile] = React.useState<File | null>(null);
	const fetcher = useFetcher<ActionData>();
	const navigate = useNavigate();
	const [isFileUploading, setIsFileUploading] = React.useState(false);

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
				navigate(`/faculty/sections/${sectionId}`);
			} else {
				toast.error("Error uploading assignment file");
			}
		} catch (error) {
			toast.error("Error uploading file");
		} finally {
			setIsFileUploading(false);
		}
	}, [file, uploadedFileKey, navigate, sectionId]);

	React.useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.success && assignmentType === "FILE") {
			handleFileUpload();
		} else if (fetcher.data.success) {
			navigate(`/faculty/sections/${sectionId}`);
		}
	}, [
		fetcher.data,
		fetcher.state,
		handleFileUpload,
		assignmentType,
		navigate,
		sectionId,
	]);

	return (
		<>
			<LoadingOverlay visible={isFileUploading} />
			<PageHeading
				title="Create Assignment"
				subtitle={`Create a new assignment for ${section.course.name} - ${section.name}`}
				showBackButton
				to={`/faculty/sections/${section.id}`}
			/>

			<div className="border-b rounded-md mt-4 p-3">
				<fetcher.Form
					onSubmit={(e) => {
						e.preventDefault();
						const formData = new FormData(e.currentTarget);

						if (assignmentType === "FILE" && file && uploadedFileKey) {
							const extension = mime.extension(file.type);
							formData.append("bucket", window.ENV.AWS_BUCKET);
							formData.append("key", uploadedFileKey);
							formData.append("extension", extension || "");
							formData.append("region", window.ENV.AWS_REGION);
						}

						fetcher.submit(formData, {
							method: "POST",
							replace: true,
						});
					}}
					className="flex flex-col gap-4"
				>
					<TextInput
						name="title"
						label="Assignment Title"
						placeholder="Enter the title of the assignment"
						required
					/>

					<Textarea
						name="description"
						label="Assignment Description"
						placeholder="Enter the description of the assignment"
						required
						minRows={3}
					/>

					<DateTimePicker
						name="deadline"
						label="Submission Deadline"
						placeholder="Pick deadline date and time"
						required
						minDate={new Date()}
					/>

					<Radio.Group
						name="type"
						label="Assignment Type"
						value={assignmentType}
						onChange={(value) => setAssignmentType(value as "TEXT" | "FILE")}
					>
						<div className="flex gap-4">
							<Radio value="TEXT" label="Text Based" />
							<Radio value="FILE" label="File Upload" />
						</div>
					</Radio.Group>

					{assignmentType === "TEXT" && (
						<Textarea
							name="textContent"
							label="Assignment Content"
							placeholder="Enter the assignment content"
							required
							minRows={5}
						/>
					)}

					{assignmentType === "FILE" && (
						<div className="border flex flex-col rounded-md p-4">
							<div>
								<input
									type="file"
									onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
								/>
							</div>
						</div>
					)}

					<div>
						<Button
							type="submit"
							variant="filled"
							color="gray"
							disabled={assignmentType === "FILE" && !file}
						>
							Create Assignment
						</Button>
					</div>
				</fetcher.Form>
			</div>
		</>
	);
}
