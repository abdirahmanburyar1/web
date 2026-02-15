import { redirect } from "next/navigation";

export default function MeterReadingsPage() {
  redirect("/meters?view=readings");
}
