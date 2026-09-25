import type { Metadata } from "next";
import "./internal.css";

export const metadata: Metadata = {
  title: "GPZytro · Internal back office",
  robots: { index: false, follow: false },
};

/** Back-office tooling. Not linked from the client experience. */
export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <div className="internal-root">{children}</div>;
}
