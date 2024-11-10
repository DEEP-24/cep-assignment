import {
    Button,
    Card,
    Group,
    Table,
    Text,
    Modal,
} from "@mantine/core";
import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { getS3Url } from "~/models/s3-utils.server";
import { useState } from "react";

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

    let assignmentUrl;
    if(assignment.fileKey) {
        assignmentUrl = await getS3Url(assignment.fileKey, {
            bucket: assignment.fileBucket!,
            region: assignment.fileRegion!,
        });
    }

	return json({ assignment, assignmentUrl });
}

export default function AssignmentDetails() {
	const { assignment, assignmentUrl } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const [selectedFeedback, setSelectedFeedback] = useState<{
		studentName: string;
		feedback: string | null;
		grade: number | null;
	} | null>(null);

	return (
		<div className="min-h-screen p-4">
			<Modal
				opened={selectedFeedback !== null}
				onClose={() => setSelectedFeedback(null)}
				title={
					<Text size="lg" weight={500}>
						Feedback
					</Text>
				}
				size="lg"
			>
				{selectedFeedback && (
					<div className="space-y-4">
						<div>
							<Text weight={500} color="dimmed" size="sm">
								Grade
							</Text>
							<Text size="lg">
								{selectedFeedback.grade ? `${selectedFeedback.grade}%` : 'Not graded'}
							</Text>
						</div>
						<div>
							<Text weight={500} color="dimmed" size="sm">
								Feedback
							</Text>
							<Text>
								{selectedFeedback.feedback || 'No feedback provided'}
							</Text>
						</div>
					</div>
				)}
			</Modal>

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
								href={assignmentUrl || ""}
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
							<th>Grade</th>
							<th>Actions</th>
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
								<td>{submission.grade ? `${submission.grade}%` : "-"}</td>
								<td>
									<Group spacing="xs">
										<Button
											component={Link}
											to={`/faculty/sections/${assignment.section.id}/assignments/${assignment.id}/${submission.student.id}`}
											size="xs"
											variant="light"
										>
											View
										</Button>
										<Button
											size="xs"
											variant="subtle"
											onClick={() => setSelectedFeedback({
												studentName: submission.student.name,
												feedback: submission.feedback,
												grade: submission.grade,
											})}
											disabled={!submission.feedback && !submission.grade}
											color={submission.feedback || submission.grade ? "blue" : "gray"}
										>
											Feedback
										</Button>
									</Group>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			</Card>
		</div>
	);
}
