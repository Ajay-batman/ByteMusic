import { Track, Playlist, Album, Artist } from '../types/spotify';

export const mockArtists: Record<string, Artist> = {
  daftPunk: {
    id: 'artist-daft-punk',
    name: 'Daft Punk',
    uri: 'spotify:artist:4tZwfgrHOc3mvqYxwDoOD1'
  },
  theWeeknd: {
    id: 'artist-the-weeknd',
    name: 'The Weeknd',
    uri: 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ'
  },
  billieEilish: {
    id: 'artist-billie-eilish',
    name: 'Billie Eilish',
    uri: 'spotify:artist:6qqNVTkY8uBg9cP3Jd7DAH'
  },
  coldplay: {
    id: 'artist-coldplay',
    name: 'Coldplay',
    uri: 'spotify:artist:4gzpq5DPGxSnKTe4SA8HAU'
  },
  sabrinaCarpenter: {
    id: 'artist-sabrina-carpenter',
    name: 'Sabrina Carpenter',
    uri: 'spotify:artist:74KM79TiuVKeVCqs8QtB0B'
  }
};

export const mockAlbums: Record<string, Album> = {
  randomAccessMemories: {
    id: 'album-ram',
    name: 'Random Access Memories',
    uri: 'spotify:album:4m2880jivSbbyEGAKfITCa',
    releaseDate: '2013-05-17',
    images: [
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/300x300bb.jpg', width: 300, height: 300 }
    ]
  },
  afterHours: {
    id: 'album-after-hours',
    name: 'After Hours',
    uri: 'spotify:album:4yP0hdKOJeu575Mq1bh0RJ',
    releaseDate: '2020-03-20',
    images: [
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/300x300bb.jpg', width: 300, height: 300 }
    ]
  },
  starboy: {
    id: 'album-starboy',
    name: 'Starboy',
    uri: 'spotify:album:2ODvWsOgouMbaA5xf0RkJe',
    releaseDate: '2016-11-25',
    images: [
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/300x300bb.jpg', width: 300, height: 300 }
    ]
  },
  hitMeHardAndSoft: {
    id: 'album-hmhas',
    name: 'HIT ME HARD AND SOFT',
    uri: 'spotify:album:7aJuG4MyANZwY0ge44aqgn',
    releaseDate: '2024-05-17',
    images: [
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/300x300bb.jpg', width: 300, height: 300 }
    ]
  },
  shortNSweet: {
    id: 'album-short-n-sweet',
    name: 'Short n Sweet',
    uri: 'spotify:album:2lAT0al223Kz8sm4wMe4F8',
    releaseDate: '2024-08-23',
    images: [
      { url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop', width: 300, height: 300 }
    ]
  },
  vivaLaVida: {
    id: 'album-viva',
    name: 'Viva La Vida or Death and All His Friends',
    uri: 'spotify:album:1kmyIRVnd55whGvg7ZsZ2U',
    releaseDate: '2008-05-25',
    images: [
      { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop', width: 300, height: 300 }
    ]
  }
};

export const mockTracks: Track[] = [
  {
    id: 'track-1',
    uri: 'spotify:track:2Foc5Q5nqNiosCNqttzHof',
    name: 'Get Lucky (feat. Pharrell Williams)',
    duration: { milliseconds: 248000 },
    artists: [mockArtists.daftPunk],
    album: mockAlbums.randomAccessMemories,
    isPlayable: true,
    isExplicit: false,
    youtubeId: '5NV6Rdv1a3I', // Official Full Song (4:08)
    addedAt: '2 days ago',
    bpm: 116
  },
  {
    id: 'track-2',
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    duration: { milliseconds: 200000 },
    artists: [mockArtists.theWeeknd],
    album: mockAlbums.afterHours,
    isPlayable: true,
    isExplicit: false,
    youtubeId: '4NRXx6U8ABQ', // Official Full Song (3:20)
    addedAt: '3 weeks ago',
    bpm: 171
  },
  {
    id: 'track-3',
    uri: 'spotify:track:7hxGo11zGz0a7N3e80sT7v',
    name: 'Starboy',
    duration: { milliseconds: 230000 },
    artists: [mockArtists.theWeeknd, mockArtists.daftPunk],
    album: mockAlbums.starboy,
    isPlayable: true,
    isExplicit: true,
    youtubeId: 'dqt8Z1k0oKQ', // Official Full Song (3:50)
    addedAt: '1 month ago',
    bpm: 186
  },
  {
    id: 'track-4',
    uri: 'spotify:track:6dOtVTDmmpvnLQIfoR944Y',
    name: 'BIRDS OF A FEATHER',
    duration: { milliseconds: 190000 },
    artists: [mockArtists.billieEilish],
    album: mockAlbums.hitMeHardAndSoft,
    isPlayable: true,
    isExplicit: false,
    youtubeId: 'V9PVRfjEBTI', // Official Full Song (3:10)
    addedAt: 'Yesterday',
    bpm: 105
  },
  {
    id: 'track-5',
    uri: 'spotify:track:2kJwzbxV2ppxnQ8Yww42vY',
    name: 'Instant Crush (feat. Julian Casablancas)',
    duration: { milliseconds: 337000 },
    artists: [mockArtists.daftPunk],
    album: mockAlbums.randomAccessMemories,
    isPlayable: true,
    isExplicit: false,
    youtubeId: 'a5uQMwRMHcs', // Official Full Song (5:37)
    addedAt: '5 days ago',
    bpm: 110
  },
  {
    id: 'track-6',
    uri: 'spotify:track:2qSkXiYg9WYQ29GIaKn22e',
    name: 'Espresso',
    duration: { milliseconds: 175000 },
    artists: [mockArtists.sabrinaCarpenter],
    album: mockAlbums.shortNSweet,
    isPlayable: true,
    isExplicit: false,
    youtubeId: 'eVli-tstM5E', // Official Full Song (2:55)
    addedAt: '4 hours ago',
    bpm: 104
  },
  {
    id: 'track-7',
    uri: 'spotify:track:1itRRhiFpqJq173S92j0d1',
    name: 'Viva La Vida',
    duration: { milliseconds: 242000 },
    artists: [mockArtists.coldplay],
    album: mockAlbums.vivaLaVida,
    isPlayable: true,
    isExplicit: false,
    youtubeId: 'dvgZkm1xWPE', // Official Full Song (4:02)
    addedAt: '1 week ago',
    bpm: 138
  }
];

export const mockPlaylists: Playlist[] = [
  {
    id: 'playlist-today-top-hits',
    uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    name: "Today's Top Hits",
    description: 'Sabrina Carpenter is on top of the Hottest 50!',
    owner: { id: 'spotify', displayName: 'Spotify' },
    images: [
      { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop' }
    ],
    tracks: mockTracks
  },
  {
    id: 'playlist-discover-weekly',
    uri: 'spotify:playlist:37i9dQZEVXcQ9JaJVvgvxv',
    name: 'Discover Weekly',
    description: 'Your weekly mixtape of fresh music. Enjoy new discoveries and deep cuts chosen just for you.',
    owner: { id: 'spotify', displayName: 'Spotify' },
    images: [
      { url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&h=300&fit=crop' }
    ],
    tracks: [mockTracks[1], mockTracks[3], mockTracks[4], mockTracks[5], mockTracks[6]]
  },
  {
    id: 'playlist-favorites',
    uri: 'spotify:playlist:user-favorites-playlist',
    name: 'Liked Songs',
    description: 'Auto-generated playlist of all your favorite songs and tracks.',
    owner: { id: 'current-user', displayName: 'You' },
    images: [
      { url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop' }
    ],
    tracks: mockTracks
  }
];
