import { Link } from "@remix-run/react";

export default function Index() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="absolute inset-0">
        <img
          className="h-full w-full object-cover"
          src="/img/background.jpeg"
          alt="background"
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>
      <div className="relative flex flex-col items-center gap-12">
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <img
              className="h-24 w-32 "
              src="/img/blackboard-logo.png"
              alt="blackboard-logo"
            />
            <h1 className="text-center text-7xl text-gray-300">Blackboard</h1>
          </div>
          <p className="max-w-3xl text-center text-lg text-gray-400">
            Choose your role and let the blackboard application redefine
            education for administrators, faculty, and students alike.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-14 ">
          <div className="flex flex-col items-center justify-center">
            <Link
              to="/admin/login"
              className="h-72 w-52 overflow-hidden rounded-xl border-2 shadow-md shadow-gray-200"
            >
              <img
                className="h-full w-full rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                src="/img/admin.avif"
                alt="Admin "
              />
            </Link>
            <div className="mt-2 text-gray-200">
              <p>Admin</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Link
              to="/faculty/login"
              className="h-72 w-52 overflow-hidden rounded-xl border shadow-md shadow-gray-200"
            >
              <img
                className="h-full w-full rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                src="/img/faculty.avif"
                alt="Faculty"
              />
              <p>Faculty</p>
            </Link>
            <div className="mt-2 text-gray-200">
              <p>Faculty</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Link
              to="/student/login"
              className="h-72 w-52 overflow-hidden rounded-xl border shadow-md shadow-gray-200"
            >
              <img
                className="h-full w-full rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                src="/img/student.jpeg"
                alt="Student"
              />
            </Link>
            <div className="mt-2 text-gray-200">
              <p>Student</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
