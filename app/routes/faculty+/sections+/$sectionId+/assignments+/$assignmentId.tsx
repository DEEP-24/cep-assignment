import {
	Button,
	Card,
	Group,
	NumberInput,
	Table,
	Text,
	Textarea,
} from "@mantine/core";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { badRequest } from "remix-utils";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

const gradeSubmissionSchema = z.object({
	submissionId: z.string().min(1),
	grade: z.number().min(0).max(100),
	feedback: z.string().optional(),
});

interface ActionData {
	success: boolean;
	fieldErrors?: inferErrors<typeof gradeSubmissionSchema>;
}

export async function loader({ params }: LoaderArgs) {
	const { sectionId, assignmentId } = params;

	if (!sectionId || !assignmentId) {
		return redirect("/faculty/sections");
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
				include: {
					student: true,
				},
			},
		},
	});

	if (!assignment) {
		return redirect(`/faculty/sections/${sectionId}`);
	}

	return json({ assignment });
}

export async function action({ request }: ActionArgs) {
	const { fields, fieldErrors } = await validateAction(
		request,
		gradeSubmissionSchema,
	);

	if (fieldErrors) {
		return badRequest<ActionData>({ success: false, fieldErrors });
	}

	await prisma.submission.update({
		where: { id: fields.submissionId },
		data: {
			grade: fields.grade,
			feedback: fields.feedback,
		},
	});

	return json<ActionData>({ success: true });
}

export default function AssignmentDetails() {
	const { assignment } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<ActionData>();
	const navigate = useNavigate();

	return (
		<div className="min-h-screen p-4">
			<PageHeading
				title={assignment.title}
				subtitle={`${assignment.section.course.name} - ${assignment.section.name}`}
				showBackButton
				to={`/faculty/sections/${assignment.section.id}`}
				rightSection={
					<Button
						variant="light"
						onClick={() =>
							navigate(
								`/faculty/sections/${assignment.section.id}/assignments/${assignment.id}/edit`,
							)
						}
					>
						Edit Assignment
					</Button>
				}
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
						<Group>
							<Text>
								<strong>File:</strong> {assignment.fileName}
							</Text>
							<Button
								variant="light"
								size="xs"
								component="a"
								href={`/resources/download-s3-object?key=${assignment.fileKey}`}
								target="_blank"
							>
								Download
							</Button>
						</Group>
					)}
				</div>
			</Card>

			<Card className="mt-4">
				<Text size="lg" weight={500} className="mb-4">
					Submissions ({assignment.submissions.length})
				</Text>
				<Table>
					<thead>
						<tr>
							<th>Student</th>
							<th>Submitted At</th>
							<th>Type</th>
							<th>Submission</th>
							<th>Grade</th>
							<th>Feedback</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{assignment.submissions.map((submission) => (
							<tr key={submission.id}>
								<td>
									{submission.student.name}
									<br />
									<Text size="xs" color="dimmed">
										{submission.student.banner_no}
									</Text>
								</td>
								<td>{format(new Date(submission.createdAt), "PPp")}</td>
								<td>{submission.fileKey ? "File" : "Text"}</td>
								<td>
									{submission.textContent ? (
										<Text>{submission.textContent}</Text>
									) : submission.fileKey ? (
										<Button
											variant="light"
											size="xs"
											component="a"
											href={`/resources/download-s3-object?key=${submission.fileKey}`}
											target="_blank"
										>
											Download
										</Button>
									) : (
										<Text color="dimmed">No submission</Text>
									)}
								</td>
								<td>
									<fetcher.Form
										method="post"
										className="flex flex-col gap-2"
										onSubmit={(e) => {
											e.preventDefault();
											const formData = new FormData(e.currentTarget);
											fetcher.submit(formData, { method: "POST" });
										}}
									>
										<input
											type="hidden"
											name="submissionId"
											value={submission.id}
										/>
										<NumberInput
											name="grade"
											defaultValue={submission.grade ?? undefined}
											min={0}
											max={100}
											size="xs"
											placeholder="Grade"
										/>
										<Textarea
											name="feedback"
											defaultValue={submission.feedback ?? undefined}
											size="xs"
											placeholder="Feedback"
										/>
										<Button type="submit" size="xs" variant="light">
											Save
										</Button>
									</fetcher.Form>
								</td>
								<td>{submission.feedback}</td>
								<td>{submission.grade ? `${submission.grade}%` : "-"}</td>
							</tr>
						))}
					</tbody>
				</Table>
			</Card>
		</div>
	);
}
