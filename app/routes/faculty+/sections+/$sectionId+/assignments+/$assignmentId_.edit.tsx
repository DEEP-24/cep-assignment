import { Button, Radio, TextInput, Textarea } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData, useParams } from "@remix-run/react";

import { badRequest } from "remix-utils";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { deleteS3Object } from "~/models/s3.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const editAssignmentSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
		deadline: z.string().optional(),
		type: z.enum(["TEXT", "FILE"]).optional(),
		textContent: z.string().optional(),
		intent: z.enum(["update", "delete"]),
	})
	.superRefine((data, ctx) => {
		if (data.intent === "update") {
			if (!data.title) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Assignment title is required",
					path: ["title"],
				});
			}
			if (!data.description) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Description is required",
					path: ["description"],
				});
			}
			if (!data.deadline) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Deadline is required",
					path: ["deadline"],
				});
			}
			if (!data.type) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Assignment type is required",
					path: ["type"],
				});
			}
		}
	});

export async function loader({ params }: LoaderArgs) {
	const { assignmentId } = params;
	const assignment = await prisma.assignment.findUnique({
		where: {
			id: assignmentId,
		},
	});

	if (!assignment) {
		return redirect("/faculty/sections");
	}

	return json({ assignmentId, assignment });
}

interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof editAssignmentSchema>;
}

export async function action({ request, params }: ActionArgs) {
	const { sectionId, assignmentId } = params;

	if (!sectionId || !assignmentId) {
		return redirect("/faculty/sections");
	}

	const { fields, fieldErrors } = await validateAction(
		request,
		editAssignmentSchema,
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	if (fields.intent === "delete") {
		const assignment = await prisma.assignment.findFirst({
			where: {
				id: assignmentId,
			},
		});

		if (!assignment) {
			return redirect(`/faculty/sections/${sectionId}`);
		}

		// If it's a file assignment, delete the file from S3
		if (assignment.fileKey) {
			await deleteS3Object({
				key: assignment.fileKey,
			});
		}

		await prisma.assignment.delete({
			where: {
				id: assignmentId,
			},
		});

		return redirect(`/faculty/sections/${sectionId}`);
	}

	if (fields.intent === "update") {
		await prisma.assignment.update({
			where: {
				id: assignmentId,
			},
			data: {
				title: fields.title,
				description: fields.description,
				deadline: new Date(fields.deadline ?? ""),
				type: fields.type,
				textContent: fields.type === "TEXT" ? fields.textContent : null,
			},
		});

		return redirect(`/faculty/sections/${sectionId}`);
	}

	return badRequest<ActionData>({ success: false });
}

export default function EditAssignment() {
	const { sectionId } = useParams();
	const { assignment } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<ActionData>();

	return (
		<>
			<PageHeading
				title="Edit Assignment"
				subtitle="Edit the assignment details"
				showBackButton
				to={`/faculty/sections/${sectionId}`}
			/>

			<div className="border rounded-md p-4 mt-3">
				<fetcher.Form method="post" className="flex flex-col gap-4">
					<TextInput
						name="title"
						label="Assignment Title"
						defaultValue={assignment.title}
						placeholder="Enter the title of the assignment"
						required
					/>

					<Textarea
						name="description"
						label="Description"
						defaultValue={assignment.description}
						placeholder="Enter the description of the assignment"
						required
						minRows={3}
					/>

					<DateTimePicker
						name="deadline"
						label="Submission Deadline"
						defaultValue={new Date(assignment.deadline)}
						placeholder="Pick deadline date and time"
						required
						minDate={new Date()}
					/>

					<Radio.Group
						name="type"
						label="Assignment Type"
						defaultValue={assignment.type}
					>
						<div className="flex gap-4">
							<Radio value="TEXT" label="Text Based" />
							<Radio value="FILE" label="File Upload" />
						</div>
					</Radio.Group>

					{assignment.type === "TEXT" && (
						<Textarea
							name="textContent"
							label="Assignment Content"
							defaultValue={assignment.textContent ?? ""}
							placeholder="Enter the assignment content"
							required={assignment.type === "TEXT"}
							minRows={5}
						/>
					)}

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
