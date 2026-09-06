import BookingForm from "@/components/booking-form";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BookingForm slug={slug} />;
}
