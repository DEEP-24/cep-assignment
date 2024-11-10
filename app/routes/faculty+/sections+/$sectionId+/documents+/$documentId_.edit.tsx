/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, Switch, TextInput } from "@mantine/core";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData, useParams } from "@remix-run/react";
import * as React from "react";
import { badRequest } from "remix-utils";
import { toast } from "sonner";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { deleteS3Object } from "~/models/s3.server";
import { validateAction, type inferErrors } from "~/utils/validation";

const editFileEntrySchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		visible: z.literal("on").optional(),
		intent: z.enum(["update", "delete"]),
	})
	.superRefine((data, ctx) => {
		if (data.intent === "update") {
			if (!data.name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Document name is required",
					path: ["name"],
				});
			}
		}
	});

export async function loader({ params }: LoaderArgs) {
	const { documentId } = params;
	const document = await prisma.document.findUnique({
		where: {
			id: documentId,
		},
	});

	if (!document) {
		return redirect("/faculty/sections");
	}

	return json({ documentId, document });
}
interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof editFileEntrySchema>;
}

export async function action({ request, params }: ActionArgs) {
	const { sectionId, documentId } = params;

	// This is already handled by the parent route
	// Once remix implements middleware, we can remove this
	if (!sectionId) {
		return redirect("/faculty/sections");
	}

	if (!documentId) {
		return redirect(`/faculty/sections/${sectionId}/documents`);
	}

	const { fields, fieldErrors } = await validateAction(
		request,
		editFileEntrySchema,
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	if (fields.intent === "delete") {
		// fields.documentId!

		const document = await prisma.document.findFirst({
			where: {
				id: documentId,
			},
		});

		if (!document) {
			return redirect(`/faculty/sections/${sectionId}`);
		}

		await deleteS3Object({
			key: document.key,
		});

		await prisma.document.delete({
			where: {
				id: documentId,
			},
		});

		return redirect(`/faculty/sections/${sectionId}`);
	}

	if (fields.intent === "update") {
		await prisma.document.update({
			where: {
				id: documentId,
			},
			data: {
				name: fields.name,
				description: fields.description,
				visible: fields.visible === "on",
			},
		});

		return redirect(`/faculty/sections/${sectionId}`);
	}

	return badRequest<ActionData>({ success: false });
}

export default function EditFile() {
	const { sectionId } = useParams();
	const { document } = useLoaderData<typeof loader>();
	const [visible, setVisible] = React.useState(false);
	const fetcher = useFetcher<ActionData>();

	return (
		<>
			<PageHeading
				title="Edit Document"
				subtitle="Edit the document details"
				showBackButton
				to={`/faculty/sections/${sectionId}`}
			/>

			<div className="border rounded-md p-4 mt-3">
				<fetcher.Form method="post" className="flex flex-col gap-4">
					<TextInput
						name="name"
						label="File Name"
						defaultValue={document.name}
						placeholder="Enter the name of the file"
						required
					/>
					<TextInput
						name="description"
						label="Description"
						defaultValue={document.description ?? ""}
						placeholder="Enter the description of the file"
						required
					/>
					<Switch
						name="visible"
						label="Visible"
						defaultChecked={document.visible}
					/>
					<div className="flex items-center justify-between">
						<Button
							type="submit"
							variant="filled"
							color="gray"
							name="intent"
							value="update"
						>
							Update
						</Button>
						<Button
							type="submit"
							variant="filled"
							color="red"
							name="intent"
							value="delete"
						>
							Delete
						</Button>
					</div>
				</fetcher.Form>
			</div>
		</>
	);
}
