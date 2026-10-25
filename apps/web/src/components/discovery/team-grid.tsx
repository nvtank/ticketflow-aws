import { ArrowUpRight, Github } from 'lucide-react';
import { contributors } from '@/lib/site';
import { Reveal } from '@/components/motion/reveal';
export function TeamGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {contributors.map((person, index) => (
        <Reveal key={person.handle} delay={index * 0.07} className="experience-card">
          <div className="artist-art relative h-48" data-color={person.color}>
            <span className="artist-orbit" />
            <span className="absolute top-5 left-5 text-[9px] tracking-[.2em]">
              THE PEOPLE / 0{index + 1}
            </span>
            <span className="absolute right-7 bottom-3 text-7xl font-bold tracking-tighter">
              {person.initials}
            </span>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">
              {person.role}
            </p>
            <h3 className="mt-3 text-lg font-bold">{person.handle}</h3>
            <p className="mt-3 min-h-16 text-sm leading-7 text-muted-foreground">
              {person.description}
            </p>
            <a
              href={`https://github.com/${person.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-between border-t pt-4 text-xs font-semibold"
            >
              <span className="flex items-center gap-2">
                <Github className="size-4" />
                Hồ sơ GitHub
              </span>
              <ArrowUpRight className="size-4 text-primary" />
            </a>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
