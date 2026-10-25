import type { Prisma } from '../generated/prisma/client';

/** Fictional, labelled local demo content. Never invent customer reviews. */
export async function seedDiscovery(db: Prisma.TransactionClient) {
  const profiles = [
    {
      slug: 'luma',
      name: 'Luma',
      genre: 'Electronic',
      color: 'violet',
      tagline: 'Chạm đến cảm xúc qua từng lớp âm thanh.',
      biography:
        'Luma là hồ sơ nghệ sĩ hư cấu dành cho bản demo TixFlow. Phong cách được mô tả là electronic pha ambient: giai điệu nhẹ nhàng mở đầu, nhịp điệu dần mở rộng và một không gian âm thanh giàu màu sắc.\n\nHồ sơ này giúp bạn khám phá mối liên kết giữa nghệ sĩ và lịch sự kiện trước khi chọn vé.',
    },
    {
      slug: 'may-acoustic',
      name: 'Mây Acoustic',
      genre: 'Acoustic',
      color: 'amber',
      tagline: 'Một chút dịu dàng giữa những ngày vội vã.',
      biography:
        'Mây Acoustic là nhóm nhạc hư cấu trong dữ liệu demo. Không gian biểu diễn được lấy cảm hứng từ guitar mộc, giọng hát gần gũi và những câu chuyện nhỏ được kể bằng âm nhạc.\n\nTên và câu chuyện chỉ phục vụ trải nghiệm phát triển, không đại diện cho nghệ sĩ hay lịch diễn có thật.',
    },
    {
      slug: 'midnight-lines',
      name: 'Midnight Lines',
      genre: 'Indie',
      color: 'rose',
      tagline: 'Những câu chuyện còn ngân sau nửa đêm.',
      biography:
        'Midnight Lines là ban nhạc indie hư cấu dùng trong bản local. Guitar, synth và trống gặp nhau trong một phong cách giàu tính tự sự, lấy cảm hứng từ thành phố về đêm.\n\nKhám phá sự kiện được liên kết bên dưới để trải nghiệm hành trình từ hồ sơ nghệ sĩ đến sơ đồ ghế.',
    },
    {
      slug: 'song',
      name: 'Sóng',
      genre: 'Alternative',
      color: 'cyan',
      tagline: 'Tự do trong từng nhịp chuyển động.',
      biography:
        'Sóng là dự án âm nhạc hư cấu dành cho TixFlow demo. Phong cách alternative kết hợp những nhịp điệu linh hoạt và âm thanh điện tử, tạo cảm hứng cho không gian lễ hội.\n\nHồ sơ minh họa khả năng giới thiệu nghệ sĩ và kết nối những trải nghiệm cùng phong cách.',
    },
  ];
  const events = await db.event.findMany({
    where: { slug: { in: ['tixflow-music-festival', 'summer-live-concert'] } },
    select: { id: true },
  });
  for (const profile of profiles) {
    const artist = await db.artist.upsert({
      where: { slug: profile.slug },
      update: {},
      create: { ...profile, isDemo: true, isPublished: true },
    });
    for (const event of events)
      await db.eventArtist.upsert({
        where: { eventId_artistId: { eventId: event.id, artistId: artist.id } },
        update: {},
        create: { eventId: event.id, artistId: artist.id },
      });
  }
}
