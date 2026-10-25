export const repositoryUrl = 'https://github.com/nvtank/ticketflow-aws';
export const publicNavigation = [
  { href: '/events', label: 'Khám phá' },
  { href: '/artists', label: 'Nghệ sĩ' },
  { href: '/community', label: 'Cộng đồng' },
  { href: '/about', label: 'Về TixFlow' },
];
export const contributors = [
  {
    handle: 'hoangphatdev',
    initials: 'HP',
    role: 'Sản phẩm & trải nghiệm',
    description: 'Nền tảng giao diện, thanh toán và trải nghiệm quản lý sự kiện.',
    color: 'violet',
  },
  {
    handle: 'nguyen-van-hoan',
    initials: 'VH',
    role: 'Sự kiện & chất lượng',
    description: 'Quản lý sự kiện, hàng đợi và kiểm thử hành trình người dùng.',
    color: 'cyan',
  },
  {
    handle: 'nvtank',
    initials: 'NT',
    role: 'Hệ thống & realtime',
    description: 'Xác thực, giữ ghế đồng thời và đồng bộ trạng thái theo thời gian thực.',
    color: 'rose',
  },
] as const;
export const categories = [
  {
    name: 'Âm nhạc',
    value: 'MUSIC',
    number: '01',
    description: 'Để âm nhạc dẫn lối.',
    color: 'violet',
  },
  {
    name: 'Hội nghị',
    value: 'CONFERENCE',
    number: '02',
    description: 'Gặp những góc nhìn mới.',
    color: 'cyan',
  },
  {
    name: 'Workshop',
    value: 'WORKSHOP',
    number: '03',
    description: 'Thử sức. Học hỏi. Kết nối.',
    color: 'rose',
  },
  {
    name: 'Thể thao',
    value: 'SPORTS',
    number: '04',
    description: 'Sống trọn từng nhịp đấu.',
    color: 'amber',
  },
] as const;
