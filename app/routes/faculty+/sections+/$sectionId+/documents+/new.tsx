import { Button, LoadingOverlay, Switch, TextInput } from "@mantine/core";
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
import { getS3Url, getUniqueS3Key } from "~/models/s3-utils.client";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

const createFileEntrySchema = z.object({
	name: z.string().min(3, "File name must be at least 3 characters long"),
	description: z.string().optional(),
	visible: z.literal("on").optional(),
	key: z.string().min(1, "File must be selected"),
	bucket: z.string().min(1, "File must be selected"),
	extension: z.string().min(1, "File must be selected"),
	region: z.string().min(1, "File must be selected"),
});

export async function loader({ params }: LoaderArgs) {
	const { sectionId } = params;

	if (!sectionId) {
		return redirect("/faculty/sections");
	}

	const section = await prisma.section.findUnique({
		where: {
			id: sectionId,
		},
		include: {
			course: true,
			faculty: true,
			room: true,
			timeSlots: true,
			_count: true,
		},
	});

	if (!section) {
		return redirect("/faculty/sections");
	}

	return json({ section });
}
interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof createFileEntrySchema>;
}

export async function action({ request, params }: ActionArgs) {
	const { sectionId } = params;
	const { fields, fieldErrors } = await validateAction(
		request,
		createFileEntrySchema,
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	if (!sectionId) {
		return redirect("/faculty/sections");
	}

	await prisma.document.create({
		data: {
			name: fields.name,
			description: fields.description,
			visible: fields.visible === "on",
			key: fields.key,
			bucket: fields.bucket,
			extension: fields.extension,
			region: fields.region,
			section: {
				connect: {
					id: sectionId,
				},
			},
		},
	});

	return json<ActionData>({ success: true });
}

export default function SectionDetails() {
	const { sectionId } = useParams();
	const { section } = useLoaderData<typeof loader>();
	const [file, setFile] = React.useState<File | null>(null);
	const [visible, setVisible] = React.useState(false);
	const fetcher = useFetcher<ActionData>();
	const navigate = useNavigate();

	const [isFileUploading, setIsFileUploading] = React.useState(false);

	const uploadedDocumentKey = React.useMemo(() => {
		if (!file) return null;

		const extension = mime.extension(file.type);
		const key = getUniqueS3Key(
			file.name,
			extension ? `.${extension}` : undefined,
		);

		return key;
	}, [file]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const handleFileUpload = React.useCallback(async () => {
		if (!file || !uploadedDocumentKey) return;

		setIsFileUploading(true);
		try {
			const data = await axios.get<{
				signedUrl: string;
			}>(`/resources/upload-s3-object?key=${uploadedDocumentKey}`);

			const uploadUrl = data.data.signedUrl;

			const response = await axios.put(uploadUrl, file, {
				headers: {
					'Content-Type': file.type,
				}
			});
			
			if (response.status === 200) {
				const url = getS3Url(uploadedDocumentKey, {
					bucket: "s3cep",
					region: "us-west-2",
				});
				console.log(url);
				toast.success("Document uploaded successfully");
				navigate(`/faculty/sections/${sectionId}`);
			} else {
				toast.error("Error uploading document");
			}
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Error uploading document: " + (error as Error).message);
		} finally {
			setIsFileUploading(false);
		}
	}, [file, navigate, sectionId, uploadedDocumentKey]);

	React.useEffect(() => {
		if (fetcher.state !== "idle") return;

		if (!fetcher.data) return;

		if (fetcher.data.success) {
			handleFileUpload();
		}
	}, [fetcher.data, fetcher.state, handleFileUpload]);

	return (
		<>
			{/* <div className="fixed">
        <div className="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
          <p className="text-sm leading-6 text-white">
            {section?.course.name} - {section?.name}
          </p>
        </div>
      </div> */}
			<LoadingOverlay visible={isFileUploading} />
			<PageHeading
				title="Upload Document"
				subtitle="Upload a document for this section"
				showBackButton
				to={`/faculty/sections/${section.id}`}
			/>
			<div className="border-b rounded-md mt-4 p-3">
				<fetcher.Form
					onSubmit={async (e) => {
						e.preventDefault();
						if (!file || !uploadedDocumentKey) return;
						const extension = mime.extension(file.type);
						const formData = new FormData(e.currentTarget);
						formData.append("bucket", window.ENV.AWS_BUCKET);
						formData.append("key", uploadedDocumentKey);
						formData.append("extension", extension || "");
						formData.append("region", window.ENV.AWS_REGION);
						console.log(JSON.stringify(Object.fromEntries(formData.entries())));
						fetcher.submit(formData, {
							method: "POST",
							replace: true,
						});
					}}
					className="flex flex-col gap-4"
				>
					<TextInput
						name="name"
						label="File Name"
						placeholder="Enter the name of the file"
						required
					/>
					<TextInput
						name="description"
						label="Description"
						placeholder="Enter the description of the file"
						required
					/>
					<div className="border flex flex-col rounded-md p-4">
						<div>
							<input
								type="file"
								onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
							/>
						</div>
					</div>
					<Switch
						name="visible"
						label="Visible"
						checked={visible}
						onChange={(e) => setVisible(e.currentTarget.checked)}
					/>
					<div>
						<Button
							disabled={!file || !uploadedDocumentKey}
							type="submit"
							variant="filled"
							color="gray"
						>
							Submit
						</Button>
					</div>
				</fetcher.Form>
			</div>
		</>
	);
}