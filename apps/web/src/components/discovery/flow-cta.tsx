import { Reveal } from '@/components/motion/reveal';
import { SectionLabel, WorldLink } from '@/components/world/primitives';
export function FlowCta() {
  return (
    <section className="editorial-cta">
      <div className="container">
        <Reveal className="editorial-cta-inner">
          <div>
            <SectionLabel>Cuộc hẹn tiếp theo đang chờ</SectionLabel>
            <h2>
              Đừng chỉ nghe kể.
              <br />
              Hãy ở đó.
            </h2>
          </div>
          <WorldLink href="/events">Tìm sự kiện của bạn</WorldLink>
        </Reveal>
      </div>
    </section>
  );
}
