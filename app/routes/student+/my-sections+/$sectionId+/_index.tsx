import { PaperClipIcon } from "@heroicons/react/24/solid";
import { LoadingOverlay } from "@mantine/core";
import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { ClientOnly } from "remix-utils";
import PageHeading from "~/components/page-heading";
import { TailwindContainer } from "~/components/tailwind-container";
import { prisma } from "~/lib/db.server";
import { getS3Url } from "~/models/s3-utils.client";
import { formatTime } from "~/utils";
import { format } from "date-fns";

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
			documents: {
				where: {
					visible: true,
				},
			},
			assignments: {
				orderBy: {
					deadline: "asc",
				},
				include: {
					submissions: true,
				},
			},
			course: true,
			room: true,
			timeSlots: true,
		},
	});

	if (!section) {
		return redirect("/faculty/sections");
	}

	return json({ section });
}

export default function SectionDocuments() {
	return (
		<div className="relative">
			<Suspense fallback={<LoadingOverlay visible />}>
				<ClientOnly>{() => <DocumentGallery />}</ClientOnly>
			</Suspense>
		</div>
	);
}

function DocumentGallery() {
	const { section } = useLoaderData<typeof loader>();
	console.log(section);

	return (
		<TailwindContainer className="rounded-md bg-white">
			<div className=" px-4 py-10 sm:px-6 lg:px-8">
				<PageHeading
					title="Section Details"
					subtitle="View section details"
					showBackButton
					to="/student/my-sections"
				/>
				<div className="mt-6 border-t border-gray-100">
					<dl className="divide-y divide-gray-100">
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Section Name</span>
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{section?.name}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Code</span>
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{section?.code}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Course</span>
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{section?.course.name}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Room Number</span>
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{section?.room.number}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">TimeSlots</span>
							</dt>
							<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
								{section?.timeSlots.map((timeSlot) => (
									<div key={timeSlot.id}>
										{timeSlot.day}: {formatTime(timeSlot.startTime)} -{" "}
										{formatTime(timeSlot.endTime)}
									</div>
								))}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Documents</span>
							</dt>
							<dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{section?.documents.length === 0 ? ( // Check if there are no documents
									<p className="text-gray-500">
										No documents uploaded by the faculty.
									</p>
								) : (
									<ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
										{section?.documents.map((document) => {
											const url = getS3Url(document.key, {
												bucket: document.bucket,
												region: document.region,
											});

											return (
												<li
													key={document.id}
													className="flex items-center justify-between py-4 pl-4 pr-5 text-sm leading-6"
												>
													<div className="flex w-0 flex-1 items-center">
														<PaperClipIcon
															className="h-5 w-5 flex-shrink-0 text-gray-400"
															aria-hidden="true"
														/>
														<div className="ml-4 flex min-w-0 flex-1 gap-2">
															<span className="truncate font-medium">
																{document.name}.{document.extension}
															</span>
														</div>
													</div>
													<div className="ml-4 flex-shrink-0 flex items-center gap-3">
														<Link
															to={url}
															referrerPolicy="no-referrer"
															target="_blank"
															className="font-medium text-indigo-600 hover:text-indigo-500"
															download
														>
															Download
														</Link>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</dd>
						</div>
						<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
							<dt className="text-sm font-medium leading-6 text-gray-900">
								<span className="font-bold">Assignments</span>
							</dt>
							<dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{section?.assignments.length === 0 ? (
									<p className="text-gray-500">
										No assignments posted by the faculty.
									</p>
								) : (
									<ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
										{section?.assignments.map((assignment) => {
											const isOverdue =
												new Date(assignment.deadline) < new Date();

											return (
												<li
													key={assignment.id}
													className="flex items-center justify-between py-4 pl-4 pr-5 text-sm leading-6"
												>
													<div className="flex w-0 flex-1 items-center">
														<PaperClipIcon
															className="h-5 w-5 flex-shrink-0 text-gray-400"
															aria-hidden="true"
														/>
														<div className="ml-4 flex min-w-0 flex-1 gap-2 flex-col">
															<span className="truncate font-medium">
																{assignment.title}
																<span className="ml-2 text-sm text-gray-500">
																	({assignment.type})
																</span>
															</span>
															<span className="text-sm text-gray-500">
																Due:{" "}
																{format(new Date(assignment.deadline), "PPp")}
																{isOverdue && (
																	<span className="ml-2 text-red-500">
																		(Overdue)
																	</span>
																)}
															</span>
															<p className="text-sm text-gray-600">
																{assignment.description}
															</p>
														</div>
													</div>
													<div className="ml-4 flex-shrink-0 flex items-center gap-3">
														<Link
															to={`/student/my-sections/${section.id}/assignments/${assignment.id}`}
															className="font-medium text-indigo-600 hover:text-indigo-500"
														>
															View Assignment
														</Link>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</TailwindContainer>
	);
}
