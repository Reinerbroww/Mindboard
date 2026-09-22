import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Mindboard
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Login</Link>
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex max-w-2xl flex-col items-center text-center">
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Turn your study materials into an interactive knowledge space
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Mindboard turns your text and PDF study materials into interactive
            mind maps. Explore key concepts, understand relationships, and
            expand your knowledge — without building the map by hand.
          </p>
          <Button size="lg" className="mt-10" asChild>
            <Link href="/register">
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}