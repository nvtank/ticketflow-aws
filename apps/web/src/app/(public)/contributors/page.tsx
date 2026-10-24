import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Github, GitPullRequest, MessageSquareText, BookOpen } from 'lucide-react';
import { PageIntro, SectionHeading } from '@/components/discovery/section-heading';
import { TeamGrid } from '@/components/discovery/team-grid';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { repositoryUrl } from '@/lib/site';
export const metadata: Metadata = { title: 'Đội ngũ & đóng góp' };
export default function ContributorsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Đội ngũ đóng góp"
        title="Không có trải nghiệm tốt nào được tạo nên một mình."
        description="Gặp những người cùng xây dựng TixFlow, từ ý tưởng và giao diện đến các nghiệp vụ phía sau một tấm vé."
      >
        <Button asChild className="mt-7">
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
            <Github />
            Khám phá mã nguồn
            <ArrowUpRight />
          </a>
        </Button>
      </PageIntro>
      <section className="container py-14">
        <TeamGrid />
        <p className="mt-6 text-xs leading-6 text-muted-foreground">
          Vai trò mô tả các phần việc của nhóm trong dự án. Lịch sử thay đổi và người đóng góp được
          ghi tại repository GitHub.
        </p>
      </section>
      <section className="container pt-8 pb-20">
        <SectionHeading
          eyebrow="Build with us"
          title="Góp một ý tưởng. Tạo một thay đổi."
          description="Bạn không cần bắt đầu bằng một tính năng lớn. Một lỗi được mô tả rõ hay một góp ý về trải nghiệm cũng có giá trị."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: MessageSquareText,
              title: 'Chia sẻ vấn đề',
              text: 'Mô tả điều bạn gặp phải, các bước tái hiện và kết quả mong đợi.',
              label: 'Mở GitHub Issues',
              href: `${repositoryUrl}/issues`,
            },
            {
              icon: GitPullRequest,
              title: 'Đề xuất thay đổi',
              text: 'Xem các thay đổi của nhóm, trao đổi và gửi phần cải thiện của bạn.',
              label: 'Xem Pull Requests',
              href: `${repositoryUrl}/pulls`,
            },
            {
              icon: BookOpen,
              title: 'Tìm hiểu dự án',
              text: 'Đọc hướng dẫn chạy local, cấu trúc và trạng thái các chức năng.',
              label: 'Đọc README',
              href: `${repositoryUrl}#readme`,
            },
          ].map(({ icon: Icon, title, text, label, href }) => (
            <Reveal key={title} className="rounded-2xl border bg-white p-7">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-link mt-6">
                {label}
                <ArrowUpRight className="size-4" />
              </a>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-indigo-50 p-6">
          <p className="text-sm text-indigo-950">Muốn biết điều gì đã đưa nhóm đến với TixFlow?</p>
          <Link href="/about" className="text-link">
            Đọc câu chuyện của chúng tôi
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
