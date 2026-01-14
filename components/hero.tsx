import { Button } from "./ui/button";

export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <p className="text-3xl lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
        Continue to Make Your Booking.
        <a href="/booking">
          <Button className="ml-2 bg-gradient-to-r from-primary to-secondary text-accent border border-primary">
            Book Now
          </Button>
        </a>
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
