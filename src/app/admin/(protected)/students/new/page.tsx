import { RegisterStudentForm } from "./form";

export default function NewStudentPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Register a student</h1>
      <RegisterStudentForm />
    </div>
  );
}
