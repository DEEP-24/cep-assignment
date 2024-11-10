import {
    Button,
    Card,
    Text,
    Textarea,
    Badge,
    Group,
    Divider,
    Box,
} from "@mantine/core";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { badRequest } from "remix-utils";
import { z } from "zod";
import PageHeading from "~/components/page-heading";
import { prisma } from "~/lib/db.server";
import { getS3Url } from "~/models/s3-utils.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";
import { useEffect } from 'react';
import { toast } from "sonner";

const gradeSubmissionSchema = z.object({
    submissionId: z.string().min(1),
    grade: z.coerce.number().min(0).max(100),
    feedback: z.string().optional(),
});

interface ActionData {
    success: boolean;
    fieldErrors?: inferErrors<typeof gradeSubmissionSchema>;
}

export async function loader({ params }: LoaderArgs) {
    const { sectionId, assignmentId, studentId } = params;

    if (!sectionId || !assignmentId || !studentId) {
        return redirect("/faculty/sections");
    }

    const submission = await prisma.submission.findFirst({
        where: {
            assignmentId,
            studentId,
        },
        include: {
            student: true,
            assignment: {
                include: {
                    section: {
                        include: {
                            course: true,
                        },
                    },
                },
            },
        },
    });

    if (!submission) {
        return redirect(`/faculty/sections/${sectionId}/assignments/${assignmentId}`);
    }

    let submissionFileUrl;
    if (submission.fileKey) {
        submissionFileUrl = await getS3Url(submission.fileKey, {
            bucket: submission.fileBucket!,
            region: submission.fileRegion!,
        });
    }

    return json({ submission, submissionFileUrl });
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

export default function StudentSubmission() {
    const { submission, submissionFileUrl } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<ActionData>();

    useEffect(() => {
        if (fetcher.data?.success) {
            toast.success('Grade and feedback saved successfully');
        } else if (fetcher.data?.fieldErrors) {
            toast.error(
                fetcher.data.fieldErrors.grade || 
                fetcher.data.fieldErrors.feedback || 
                'Please check the form for errors'
            );
        }
    }, [fetcher.data]);

    return (
        <div className="min-h-screen p-4 max-w-5xl mx-auto">
            <PageHeading
                title={`${submission.student.name}'s Submission`}
                subtitle={`${submission.assignment.title} - ${submission.assignment.section.course.name}`}
                showBackButton
                to={`/faculty/sections/${submission.assignment.section.id}/assignments/${submission.assignment.id}`}
            />

            <div className="mt-6 grid gap-6">
                <Card shadow="sm" p="lg" radius="md" withBorder>
                    <Group position="apart" mb="md">
                        <Text size="lg" weight={600} color="blue">
                            Student Details
                        </Text>
                        <Badge 
                            size="lg" 
                            variant="outline"
                            color={submission.grade ? 'green' : 'yellow'}
                        >
                            {submission.grade ? `Grade: ${submission.grade}%` : 'Not Graded'}
                        </Badge>
                    </Group>
                    <Divider mb="md" />
                    <div className="grid grid-cols-2 gap-4">
                        <Box>
                            <Text size="sm" color="dimmed">Name</Text>
                            <Text weight={500}>{submission.student.name}</Text>
                        </Box>
                        <Box>
                            <Text size="sm" color="dimmed">Banner ID</Text>
                            <Text weight={500}>{submission.student.banner_no}</Text>
                        </Box>
                        <Box>
                            <Text size="sm" color="dimmed">Email</Text>
                            <Text weight={500}>{submission.student.email}</Text>
                        </Box>
                        <Box>
                            <Text size="sm" color="dimmed">Date of Birth</Text>
                            <Text weight={500}>
                                {format(new Date(submission.student.date_of_birth), "PP")}
                            </Text>
                        </Box>
                    </div>
                </Card>

                <Card shadow="sm" p="lg" radius="md" withBorder>
                    <Text size="lg" weight={600} color="blue" mb="md">
                        Submission Details
                    </Text>
                    <Divider mb="md" />
                    <div className="space-y-6">
                        <Box>
                            <Text size="sm" color="dimmed" mb={1}>Submitted At</Text>
                            <Badge variant="dot">
                                {format(new Date(submission.createdAt), "PPp")}
                            </Badge>
                        </Box>

                        <Box>
                            <Text size="sm" color="dimmed" mb={2}>Content</Text>
                            {submission.textContent ? (
                                <Card withBorder p="sm" radius="sm">
                                    <Text>{submission.textContent}</Text>
                                </Card>
                            ) : submissionFileUrl ? (
                                <Button
                                    variant="light"
                                    component="a"
                                    href={submissionFileUrl}
                                    target="_blank"
                                    leftIcon={<span>📎</span>}
                                >
                                    Download Submission
                                </Button>
                            ) : (
                                <Text color="dimmed" italic>No submission</Text>
                            )}
                        </Box>

                        <Box className="pt-4">
                            <Text size="lg" weight={600} color="blue" mb="md">
                                Grading
                            </Text>
                            <Divider mb="md" />
                            <fetcher.Form 
                                method="post" 
                                className="space-y-4"
                            >
                                <input
                                    type="hidden"
                                    name="submissionId"
                                    value={submission.id}
                                />
                                <div>
                                    <Text size="sm" color="dimmed" mb={1}>Grade</Text>
                                    <input 
                                        type="number"
                                        name="grade"
                                        defaultValue={submission.grade ?? undefined}
                                        min={0}
                                        max={100}
                                        className="w-full p-2 rounded border border-gray-300"
                                        required
                                        step={1}
                                    />
                                    {fetcher.data?.fieldErrors?.grade && (
                                        <Text color="red" size="sm">
                                            {fetcher.data.fieldErrors.grade}
                                        </Text>
                                    )}
                                </div>

                                <div>
                                    <Text size="sm" color="dimmed" mb={1}>Feedback</Text>
                                    <Textarea
                                        name="feedback"
                                        defaultValue={submission.feedback ?? undefined}
                                        placeholder="Provide detailed feedback for the student..."
                                        minRows={4}
                                        size="md"
                                        error={fetcher.data?.fieldErrors?.feedback}
                                        styles={{
                                            input: {
                                                backgroundColor: 'var(--mantine-color-gray-0)',
                                            },
                                        }}
                                    />
                                </div>

                                <Group position="right" mt="xl">
                                    <Button 
                                        type="submit" 
                                        size="md"
                                        color="blue"
                                        variant="filled"
                                        loading={fetcher.state === 'submitting'}
                                        disabled={fetcher.state === 'submitting'}
                                    >
                                        {fetcher.state === 'submitting' ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </Group>
                            </fetcher.Form>
                        </Box>
                    </div>
                </Card>
            </div>
        </div>
    );
}
