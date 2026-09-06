import { notFound, redirect } from "next/navigation";

export default function BookingRedirectPage() {
  if (process.env.APP_ENV === "test" || process.env.APP_ENV === "production") {
    notFound();
  }

  redirect("/book/dev-owner");
}
