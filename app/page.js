'use client';
import { supabase } from '../supabase'; // Supabase istemcisini içe aktar
import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import html2canvas from 'html2canvas';

// Discord Webhook Yardımcı Fonksiyonu (Dosyanın en başında tanımlanmalı)
const sendDiscordNotification = async (content, embed = null, file = null) => {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Discord Webhook URL bulunamadı (NEXT_PUBLIC_DISCORD_WEBHOOK_URL)");
    return;
  }
  try {
    const headers = {};
    let body;

    if (file) {
      body = new FormData();
      body.append('file', file, 'teslimat_kaniti.png');
      body.append('payload_json', JSON.stringify({
        content: content,
        embeds: embed ? [embed] : []
      }));
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        content: content,
        embeds: embed ? [embed] : []
      });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: headers,
      body: body
    });
  } catch (err) { console.error("Discord Webhook Hatası:", err); }
};

// Discord Embed Şablon Oluşturucu
const getDiscordStatusEmbed = (status, customerName, trackingNumber, customerDiscord = null) => {
  const customer = customerName || "Değerli Müşterimiz";
  let description = "";
  let color = 3447003; // Varsayılan Mavi

  switch (status) {
    case 'received':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz tarafımıza ulaşmıştır. İşlemleriniz başlatılmıştır.\n\n**GoPostal**`;
      color = 3447003;
      break;
    case 'processing':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz işleme alınmıştır.\n\n**GoPostal**`;
      color = 15844367;
      break;
    case 'transit':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz aktarım merkezine ulaşmıştır ve bir sonraki aşama için hazırlanmaktadır.\n\n**GoPostal**`;
      color = 10181046;
      break;
    case 'out_for_delivery':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz dağıtıma çıkarılmıştır. Kuryemiz gün içerisinde teslimatı gerçekleştirecektir.\n\n**GoPostal**`;
      color = 15105570;
      break;
    case 'delivered':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz başarıyla teslim edilmiştir. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n**GoPostal**`;
      color = 3066993;
      break;
    case 'failed':
      description = `Sayın **${customer}**,\n\n**${trackingNumber}** numaralı gönderiniz teslim edilememiştir. Lütfen sitemiz üzerinden durumunuzu kontrol ediniz.\n\n**GoPostal**`;
      color = 15158332;
      break;
  }

  const fields = [];
  if (customerDiscord && customerDiscord !== "null" && customerDiscord !== "") {
    fields.push({ name: "Alıcı Discord", value: `@${customerDiscord}`, inline: true });
  }

  return {
    title: `📦 Kargo Durum Güncellemesi`,
    description: description,
    color: color,
    thumbnail: { url: 'https://cppiiabotmdacjrhjcgv.supabase.co/storage/v1/object/public/assets/gopostolmaksot.png' }, // Gopo resmi
    footer: { text: "GoPostal Lojistik Sistemleri" },
    timestamp: new Date().toISOString(),
    fields: fields.length > 0 ? fields : undefined
  };
};

// Notification Bileşeni
const Notification = ({ message, type = 'info', onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const typeClasses = {
    success: 'bg-green-500/20 border-green-500/30',
    error: 'bg-red-500/20 border-red-500/30',
    info: 'bg-blue-500/20 border-blue-500/30',
    warning: 'bg-yellow-500/20 border-yellow-500/30',
  };

  const iconClasses = {
    success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-yellow-500',
  };

  const icons = { success: '✓', error: '!', info: 'i', warning: '!' };

  return (
    <div className={`w-full max-w-sm p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'} ${typeClasses[type] || typeClasses.info}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm text-white ${iconClasses[type] || iconClasses.info}`}>{icons[type] || icons.info}</div>
        <p className="flex-1 text-sm font-medium text-white/90">{message}</p>
        <button onClick={handleDismiss} className="text-lg opacity-70 hover:opacity-100 text-white/80">&times;</button>
      </div>
    </div>
  );
};

// Yükleme Ekranı Bileşeni
const BACKGROUND_IMAGES = [
  '/background1.webp',
  '/background2.webp',
  '/background3.webp',
  '/background4.webp',
  '/background5.webp',
];

const RANK_LABELS = {
  driver: 'Kargo Şöförü',
  staff: 'Çalışan',
  manager: 'Şube Müdürü',
  admin: 'Yönetici'
};

// Yükleme Ekranı Bileşeni
const LoadingScreen = ({ onFinished }) => {
  const [isSliding, setIsSliding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false); // Ekranın tamamen solması için yeni durum

  const handleCloseBanner = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(onFinished, 500); // Solma süresi
  }, [onFinished]);

  useEffect(() => {
    let slideTimer, showBannerTimer, autoCloseBannerTimer;

    // Aşama 1: Logo animasyonu (nabız atışı ve kenara kayma)
    slideTimer = setTimeout(() => {
      setIsSliding(true);
    }, 500); // Logo 1.5 saniye sonra köşeye kayar

    // Aşama 2: Logo kaydıktan sonra afişi göster
    showBannerTimer = setTimeout(() => {
      setShowBanner(true);
      // Afişin otomatik kapanma zamanlayıcısını başlat
      autoCloseBannerTimer = setTimeout(() => {
        handleCloseBanner();
      }, 15000); // Afiş 15 saniye sonra otomatik kapanır
    }, 500); // Afiş, kayma başladıktan 1.5 saniye sonra (toplam 3 saniye) görünür olur

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(showBannerTimer);
      clearTimeout(autoCloseBannerTimer); // Bileşen erken kaldırılırsa zamanlayıcıyı temizle
    };
  }, [handleCloseBanner]);

  return (
    <div className={`fixed inset-0 bg-background z-[100] transition-opacity duration-500 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
    {/* Başlangıç Logo Animasyonu - afiş görünene kadar aktif */}
     {!showBanner && (
        <div 
          className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center transition-opacity ease-in-out select-none"
          style={{
            transform: 'translate(-50%, -50%)', // Ekranı hem dikey hem yatay kesin ortalar
            transitionDuration: '1000ms',        // Geçiş süresi tam 1 saniye
            opacity: isSliding ? 0 : 1,          // Tetiklendiğinde 1 saniyede solup kaybolur
          }}
        >
          <img
            src="/gtawtr-go.webp"
            alt="Yükleniyor..."
            className="animate-pulse-logo object-contain"
            style={{ width: '9rem', height: '9rem' }}
          />
          <p className="text-white text-sm font-semibold mt-4 text-center whitespace-nowrap">
          </p>
        </div>
      )}

     {/* Afiş Animasyonu - başlangıç logo aşamasından sonra görünür */}
      {showBanner && (
        <div 
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 animate-fadeIn"
          style={{ backgroundColor: 'transparent', backgroundImage: 'none' }} // Satır içi CSS ile kesin şeffaflık sağladık
        >
          <img
            src="/KtULvLP.png" // Afiş görseli
            alt="GoPostal Afiş"
            className="max-w-[80vw] max-h-[80vh] object-contain"
          />
          <button
            onClick={handleCloseBanner}
            className="absolute top-4 right-4 text-white text-3xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

const getFormattedTimestamp = () => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Arama Yükleme Animasyonu
const SearchLoadingAnimation = () => (
  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
    <p className="text-white font-bold animate-pulse">SORGULANIYOR...</p>
  </div>
);

const INITIAL_COURIERS = {
  'john-doe': {
    id: 'john-doe',
    name: 'John "Postman" Doe',
    phone: '555-0188-GPOSTAL',
    photo: '/courier-john.webp',
    role: 'Senior Courier',
    startDate: '2022-08-15',
    rank: 'manager',
    status: 'active', // 'active', 'on_leave', 'terminated', 'pending_approval'
    discord_tag: 'johnpostman#0',
    password: 'gopostal123',
    notes: 'Specializes in high-value deliveries to the Vinewood Hills area. Excellent driving record.'
  },
  'jane-smith': {
    id: 'jane-smith',
    name: 'Jane "Wheels" Smith',
    phone: '555-0123-GPOSTAL',
    photo: '/courier-jane.webp', // Bu dosyanın public klasöründe olduğunu varsayıyoruz
    role: 'Express Delivery Specialist',
    startDate: '2023-03-10',
    rank: 'driver',
    discord_tag: 'janewheels#0',
    status: 'active',
    password: 'gopostal123',
    notes: 'Handles most of the downtown Los Santos and Pillbox Hill routes. Known for speed and efficiency.'
  }
};

const DATA = {
  "GO-LS-001": {
    id: "demo-id-1",
    trackingNumber: "GO-LS-001", sender: "Ammunation", receiver: "Lamar Davis",
    origin: "Pillbox Hill, Los Santos", destination: "Grove Street, Davis", weight: "2.4 kg",
    estimatedDelivery: "26 Mayıs 2026", currentStatus: "out_for_delivery",
    courierId: 'john-doe',
    events: [
      { timestamp: "25 May 2026, 08:14", location: "LS Central Sorting Facility", description: "Paket dağıtım aracına yüklendi, teslimata çıktı.", status: "out_for_delivery" },
      { timestamp: "24 May 2026, 22:45", location: "LS Central Sorting Facility", description: "Paket aktarma merkezine ulaştı.", status: "transit" },
      { timestamp: "24 May 2026, 11:30", location: "LSIA Cargo Terminal", description: "Paket sevk edildi.", status: "transit" },
      { timestamp: "23 May 2026, 17:22", location: "Pillbox Hill GoPostal Office", description: "Paket işleme alındı.", status: "processing" },
      { timestamp: "23 May 2026, 14:05", location: "Pillbox Hill GoPostal Office", description: "Paket göndericiden teslim alındı.", status: "received" }
    ]
  },
  "GO-PB-002": {
    id: "demo-id-2",
    trackingNumber: "GO-PB-002", sender: "Binco Clothing", receiver: "Trevor Philips",
    origin: "Vespucci Canals, Los Santos", destination: "Sandy Shores, Blaine County", weight: "0.8 kg",
    estimatedDelivery: "24 Mayıs 2026", currentStatus: "delivered",
    courierId: 'jane-smith',
    created_at: "2026-05-22T11:18:00Z",
    events: [
      { timestamp: "24 May 2026, 14:37", location: "Sandy Shores, Blaine County", description: "Paket alıcıya teslim edildi. İmzalayan: Ron Jakowski", status: "delivered" },
      { timestamp: "24 May 2026, 09:12", location: "Grand Senora Desert Sorting Facility", description: "Dağıtıma çıktı.", status: "out_for_delivery" },
      { timestamp: "23 May 2026, 20:55", location: "Grand Senora Desert Sorting Facility", description: "Paket aktarma merkezine ulaştı.", status: "transit" },
      { timestamp: "22 May 2026, 16:40", location: "LSIA Cargo Terminal", description: "Uçağa yüklendi.", status: "transit" },
      { timestamp: "22 May 2026, 11:18", location: "Vespucci GoPostal Office", description: "Paket göndericiden teslim alındı.", status: "received" }
    ]
  }
};

const INITIAL_PAGES = {
  'hizmetler': {
    title: 'Hizmetler',
    items: {
      'kargo-takip': { title: 'Kargo Takip', content: '' },
      'gonderim-olustur': { title: 'Gönderim Oluştur', content: '' },
      'toplu-gonderim': { title: 'Toplu Gönderim', content: '' },
      'api-entegrasyonu': { title: 'API Entegrasyonu', content: '' },
    }
  },
  'destek': {
    title: 'Destek',
    items: {
      'sss': { title: 'Sıkça Sorulan Sorular', content: 'Sıkça Sorulan Sorular içeriği buraya gelecek.' },
      'sube-bul': { title: 'Şube Bul', content: '' },
      'fiyat-hesapla': { title: 'Fiyat Hesapla', content: '' },
      'talep-olustur': { title: 'Talep Oluştur', content: '' },
    }
  },
  'kurumsal': {
    title: 'Kurumsal',
    items: {
      'hakkimizda': { title: 'Hakkımızda', content: '' },
      'kariyer': { title: 'Kariyer', content: '' },
      'basin': { title: 'Basın', content: '' },
      'iletisim': { title: 'İletişim', content: '' },
    }
  }
};

const INITIAL_SITE_CONFIG = {
  phone: '555-0188',
  email: 'support@gopostal.com',
  headerNav: [
    { title: 'Gönderim Abonesi Ol', slug: 'abone-ol' },
    { title: 'Gönderim Oluştur', slug: 'gonderim-olustur' },
    { title: 'Şubeler', slug: 'sube-bul' },
    { title: 'Fiyatlar', slug: 'fiyat-hesapla' },
    { title: 'İletişim', slug: 'iletisim' },
  ]
};

const INITIAL_SUBSCRIBERS = {};

const INITIAL_PARTNERS = {
  'partner-1': { id: 'partner-1', name: 'Ammunation', logoUrl: 'https://i.imgur.com/y3LzW1k.png' },
  'partner-2': { id: 'partner-2', name: 'Binco', logoUrl: 'https://i.imgur.com/Jz8hVjG.png' },
  'partner-3': { id: 'partner-3', name: 'Cluckin Bell', logoUrl: 'https://i.imgur.com/ZJg2Vss.png' },
  'partner-4': { id: 'partner-4', name: 'Burger Shot', logoUrl: 'https://i.imgur.com/hVnLgB6.png' },
  'partner-5': { id: 'partner-5', name: 'FlyUS', logoUrl: 'https://i.imgur.com/fJMn2gM.png' },
  'partner-6': { id: 'partner-6', name: 'Lifeinvader', logoUrl: 'https://i.imgur.com/2nL3gG1.png' },
  'partner-7': { id: 'partner-7', name: 'Up-n-Atom', logoUrl: 'https://i.imgur.com/I4p2W8L.png' },
};

const INITIAL_COURIER_CALLS = {
  'call-1685000000000': {
    id: 'call-1685000000000',
    name: 'Lamar',
    surname: 'Davis',
    address: 'Grove Street, Davis',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: 'pending', // pending, assigned, completed
    courierId: null,
  },
  'call-1685000100000': {
    id: 'call-1685000100000',
    name: 'Michael',
    surname: 'De Santa',
    address: 'Portola Drive, Rockford Hills',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    status: 'assigned',
    courierId: 'jane-smith',
  }
};
const INITIAL_CONTACT_MESSAGES = {
  'msg-1': {
    id: 'msg-1',
    name: 'Michael',
    surname: 'De Santa',
    message: 'Kargom hala gelmedi, nerede bu lanet olası paket?',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    status: 'new'
  }
};

const INITIAL_BRANCHES = {
  'gopostal-lsia': {
    id: 'gopostal-lsia',
    name: 'GoPostal Lojistik Merkezi',
    address: 'Los Santos Uluslararası Havaalanı'
  },
  'gopostal-vespucci': {
    id: 'gopostal-vespucci',
    name: 'GoPostal Vespucci Şubesi',
    address: 'Vespucci Bulvarı, Vespucci'
  },
  'gopostal-sandy': {
    id: 'gopostal-sandy',
    name: 'GoPostal Sandy Shores Ofisi',
    address: 'Algonquin Bulvarı, Sandy Shores'
  }
};

const STATUS_CFG = {
  received: { label: "Alındı", color: "text-blue-400", border: "border-blue-400/30", bg: "bg-blue-400/10" },
  processing: { label: "İşleme Alındı", color: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10" },
  transit: { label: "Aktarım Merkezinde", color: "text-purple-400", border: "border-purple-400/30", bg: "bg-purple-400/10" },
  out_for_delivery: { label: "Dağıtımda", color: "text-orange-400", border: "border-orange-400/30", bg: "bg-orange-400/10" },
  delivered: { label: "Teslim Edildi", color: "text-green-400", border: "border-green-400/30", bg: "bg-green-400/10" },
  failed: { label: "Teslim Edilemedi", color: "text-red-400", border: "border-red-400/30", bg: "bg-red-400/10" }
};
// İletişim Formu
const ContactForm = ({ onSubmit, addNotification }) => {
  const [formData, setFormData] = useState({ name: '', surname: '', message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.surname || !formData.message) {
      addNotification('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    onSubmit(formData);
    setFormData({ name: '', surname: '', message: '' });
    addNotification('Mesajınız başarıyla gönderildi. En kısa sürede size geri dönüş yapacağız.', 'success');
  };

  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4"><input type="text" name="name" placeholder="İsim" value={formData.name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required /><input type="text" name="surname" placeholder="Soyisim" value={formData.surname} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required /></div>
        <textarea name="message" placeholder="Sorununuz..." value={formData.message} onChange={handleChange} rows="5" className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary" required />
        <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">Mesajı Gönder</button>
      </form>
    </div>
  );
};

// Kurye Çağırma Formu
const CallCourierForm = ({ onCallCourier, addNotification }) => {
  const [formData, setFormData] = useState({ name: '', surname: '', address: '', phone: '', email: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.surname || !formData.address || !formData.phone) {
      addNotification('Lütfen tüm alanları doldurun.', 'error'); // Add email to validation
      return;
    }
    onCallCourier(formData);
    addNotification('Kurye talebiniz alındı. En yakın kuryemiz size yönlendirilecektir.', 'success');
    setFormData({ name: '', surname: '', address: '', phone: '', email: '' }); // Reset email field
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input type="text" name="name" placeholder="İsim" value={formData.name} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
        <input type="text" name="surname" placeholder="Soyisim" value={formData.surname} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
      </div>
      <input type="text" name="address" placeholder="Adresiniz" value={formData.address} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
      <input type="tel" name="phone" placeholder="Telefon Numaranız" value={formData.phone} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
      <input type="text" name="email" placeholder="Mail Adresiniz (Discord ismi #)" value={formData.email} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
      <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">Kurye Çağır</button>
    </form>
  );
};

// Karakter Seçim Modalı
const CharacterSelectModal = ({ characters, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center backdrop-blur-md">
      <div className="bg-card border border-white/10 p-8 rounded-2xl max-w-md w-full text-center animate-popIn">
        <h2 className="text-2xl font-bold mb-2">Karakter Seçimi</h2>
        <p className="text-muted-fg mb-6 text-sm">Lojistik sistemine hangi karakterinizle devam etmek istiyorsunuz?</p>
        <div className="space-y-3">
          {characters.map((char) => (
            <button
              key={char.id || char.name}
              onClick={() => onSelect(char)}
              className="w-full p-4 rounded-xl bg-secondary border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center justify-between group"
            >
              <span className="font-bold group-hover:text-primary transition-colors">{char.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-fg group-hover:text-primary"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// İş Ortakları Bölümü
const PartnersSection = ({ partners }) => {
  return (
    <section className="py-16">
      <h2 className="text-3xl font-bold text-center mb-2">İŞ ORTAKLARIMIZ</h2>
      <p className="text-muted-fg text-center mb-8">Güven ve hızla taşıdığımız değerli markalar.</p>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
        <div className="flex overflow-x-auto space-x-16 py-4 px-24" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
          {Object.values(partners).map(partner => (
            <div key={partner.id} className="flex-shrink-0 flex items-center justify-center h-16" title={partner.name}>
              <img
                src={partner.logoUrl}
                alt={partner.name}
                className="max-h-full max-w-[150px] object-contain transition-transform duration-300 ease-in-out hover:scale-110"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Gopo AI Chat Modal
const GopoChatModal = ({ onClose }) => {
  const [phase, setPhase] = useState('intro'); // 'intro', 'form', 'chat'
  const [typedText, setTypedText] = useState('');
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isGopoTyping, setIsGopoTyping] = useState(false);
  const chatEndRef = useRef(null);

  const introText = "Karşınızda Gopo: Kapınızı Çalan Gülümseme!\n\nO sıradan bir karton kutu değil; o, GoPostal'ın enerjisi, hız tutkusu ve bitmek tükenmeyen neşesi! Tanıştıralım: Gopo. Gopo, kargoların sadece eşyalardan ibaret olmadığını, aslında sevdiklerinize gönderdiğiniz bir mutluluk taşıdığını çok iyi biliyor. Yüzündeki o kocaman gülümseme ve havaya gururla kaldırdığı paketiyle kapınızda belirdiğinde, gününüzün aydınlanması garanti. Minik çizmeleriyle yolları hızla aşar, en değerli gönderilerinizi güvenle ve neşeyle taşır. Gopo yola çıktıysa, güzel haberler yakında demektir!";

  // Typewriter effect for intro
  useEffect(() => {
    if (phase === 'intro') {
      setTypedText('');
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < introText.length) {
          setTypedText(prev => prev + introText.charAt(i));
          i++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => {
            setPhase('form');
          }, 2000); // Wait a bit after typing finishes
        }
      }, 25); // Typing speed

      return () => clearInterval(typingInterval);
    }
  }, [phase]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGopoTyping]);

  const handleStartChat = (e) => {
    e.preventDefault();
    if (userName.trim() && userSurname.trim()) {
      setPhase('chat');
      setIsGopoTyping(true);
      setTimeout(() => {
        setMessages([
          { sender: 'gopo', text: `Merhaba ${userName}! Sana nasıl yardımcı olabilirim? Kargo takibi, fiyat hesaplama veya şube bilgisi gibi konularda sorularını yanıtlayabilirim.` }
        ]);
        setIsGopoTyping(false);
      }, 1000);
    }
  };

  const getGopoResponse = (userMessage) => {
    const msg = userMessage.toLowerCase();
    if (msg.includes('kargom nerede') || msg.includes('takip no') || msg.match(/GO-[A-Z]{2}-\d{3}/i)) {
      return 'Elbette, kargonuzun durumunu kontrol edebilirim. Lütfen 10 haneli takip numaranızı yazar mısınız? (Örn: GO-LS-001)';
    }
    if (msg.includes('fiyat') || msg.includes('ücret') || msg.includes('ne kadar')) {
      return 'Gönderi ücretini hesaplamak için ana menüdeki "Fiyatlar" sayfamızı ziyaret edebilirsiniz. Dilerseniz sizi oraya yönlendirebilirim.';
    }
    if (msg.includes('şube') || msg.includes('nerede')) {
      return 'Size en yakın şubemizi bulmak için ana menüdeki "Şubeler" bağlantısını kullanabilirsiniz. Harita üzerinden tüm şubelerimizi görebilirsiniz.';
    }
    if (msg.includes('merhaba') || msg.includes('selam')) {
      return `Tekrar merhaba ${userName}! Nasıl yardımcı olabilirim?`;
    }
    if (msg.includes('teşekkür')) {
      return 'Rica ederim! Başka bir konuda yardımcı olabilir miyim?';
    }
    const randomResponses = [
      `Bu çok ilginç bir soru, ${userName}! Gopo'nun veri tabanında buna tam bir cevap yok ama paketlerin mutluluk taşıdığını söyleyebilirim!`,
      "Hmm, bu konu hakkında derinlemesine düşünüyorum... Sanırım en iyi cevap '42' olabilir, ne dersin?",
      "Gopo şu anda çok önemli bir paketi teslim ediyor, bu soruya daha sonra dönse olur mu? Acil bir durum yoksa tabii!",
      "Bu sorunun cevabı, San Andreas'ın en gizemli paketi kadar sırlarla dolu. Ama senin için araştıracağım!",
      "Bir saniye... Kutu beynimdeki devreler biraz ısındı. Daha basit bir şey sorabilir misin?",
      "Bunu bir sonraki güncellememde öğreneceğim! Şimdilik, kargonun yolda olduğunu bilmek seni mutlu eder mi?"
    ];
    return randomResponses[Math.floor(Math.random() * randomResponses.length)];
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    setTimeout(() => {
      setIsGopoTyping(true);
      setTimeout(() => {
        const gopoResponse = { sender: 'gopo', text: getGopoResponse(currentInput) };
        setMessages(prev => [...prev, gopoResponse]);
        setIsGopoTyping(false);
      }, 1200 + Math.random() * 800);
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-white/[0.08] w-full max-w-lg h-[90vh] max-h-[700px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 p-4 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/gopostolmaksot.png" alt="Gopo" className="w-10 h-10" />
            <div>
              <h3 className="font-bold text-lg">Gopo Yardım</h3>
              <p className="text-xs text-green-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Çevrimiçi</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary hover:bg-white/10 flex items-center justify-center text-2xl font-light">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {phase === 'intro' && (
            <div className="flex flex-col items-center justify-center h-full text-center relative animate-popIn">
              <img src="/gopostolmaksot.png" alt="Gopo Yükleniyor" className="w-32 h-32 animate-float mb-4" />
              <p className="text-muted-fg whitespace-pre-wrap font-mono text-sm">{typedText}<span className="animate-pulse">_</span></p>
              <button onClick={() => setPhase('form')} className="absolute bottom-8 text-xs text-muted-fg hover:text-foreground underline transition-colors">
                Tanıtımı Geç
              </button>
            </div>
          )}
          {phase === 'form' && (
            <div className="flex flex-col items-center justify-center h-full animate-popIn">
              <h4 className="text-xl font-semibold mb-4">Yardıma başlamadan önce...</h4>
              <p className="text-muted-fg text-center mb-6">Size daha iyi hizmet verebilmem için adınızı ve soyadınızı öğrenebilir miyim?</p>
              <form onSubmit={handleStartChat} className="w-full max-w-sm space-y-3">
                <input type="text" placeholder="İsim" value={userName} onChange={e => setUserName(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                <input type="text" placeholder="Soyisim" value={userSurname} onChange={e => setUserSurname(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">Sohbeti Başlat!</button>
              </form>
            </div>
          )}
          {phase === 'chat' && (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'gopo' && <img src="/gopostolmaksot.png" alt="Gopo" className="w-8 h-8 self-start flex-shrink-0" />}
                  <div className={`max-w-[80%] p-3 rounded-2xl animate-popIn ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-lg' : 'bg-secondary rounded-bl-lg'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isGopoTyping && (
                <div className="flex items-end gap-3 justify-start animate-popIn">
                  <img src="/gopostolmaksot.png" alt="Gopo" className="w-8 h-8 self-start flex-shrink-0" />
                  <div className="max-w-[80%] p-3 rounded-2xl bg-secondary rounded-bl-lg">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-muted-fg rounded-full animate-pulse-dot [animation-delay:0s]"></span>
                      <span className="w-2 h-2 bg-muted-fg rounded-full animate-pulse-dot [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-muted-fg rounded-full animate-pulse-dot [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {phase === 'chat' && (
          <div className="flex-shrink-0 p-4 border-t border-white/[0.08]">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Mesajınızı yazın..." className="flex-1 h-12 px-4 rounded-xl bg-secondary border border-white/[0.08]" autoFocus />
              <button type="submit" className="h-12 w-12 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// Herkesin Kullanabildiği Gönderi Oluşturma Formu
const CreateShipmentForm = ({ onCreateShipment, addNotification }) => {
  const [formData, setFormData] = useState({
    sender: '',
    receiver: '',
    originAddress: '',
    destinationAddress: '',
    weight: '',
    email: '',
    phone: '',
  });
  const [isSigned, setIsSigned] = useState(false);
  const signatureCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDrawing = (e) => {
      isDrawing = true;
      const { x, y } = getPos(e);
      [lastX, lastY] = [x, y];
    };

    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      setIsSigned(true);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      [lastX, lastY] = [x, y];
    };

    const stopDrawing = () => {
      isDrawing = false;
      ctx.beginPath();
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      setIsSigned(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSigned) {
      addNotification('Lütfen gönderici imzasını ekleyin.', 'error');
      return;
    }
    const signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
    // Eğer giriş yapılmışsa formu kullanıcının kimliğiyle zenginleştir
    onCreateShipment({ ...formData, signatureDataUrl });
  };

  return (
    <div className="pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Yeni Gönderi Oluştur</h1>
        <p className="text-muted-fg mb-8">Paketinizi San Andreas'ın herhangi bir yerine göndermek için aşağıdaki formu doldurun.</p>
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4 bg-card border border-white/[0.08] rounded-2xl p-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Gönderi Detayları</h3>
            <input type="text" name="sender" placeholder="Gönderici Adı" value={formData.sender} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="receiver" placeholder="Alıcı Adı" value={formData.receiver} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="originAddress" placeholder="Teslim Alınacak Adres (örn: Grove Street)" value={formData.originAddress} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="destinationAddress" placeholder="Teslim Edilecek Adres (örn: Vinewood Hills)" value={formData.destinationAddress} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="weight" placeholder="Ağırlık (örn: 1.5 kg)" value={formData.weight} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="tel" name="phone" placeholder="Telefon Numaranız" value={formData.phone} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="email" placeholder="Mail Adresiniz (Discord ismi #)" value={formData.email} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <div className="pt-4">
              <h3 className="text-lg font-semibold">Gönderici İmzası</h3>
              <p className="text-xs text-muted-fg mb-2">Lütfen aşağıdaki alana imzanızı atın.</p>
              <div className="bg-secondary border border-white/[0.08] rounded-xl p-1">
                <canvas ref={signatureCanvasRef} width="400" height="150" className="w-full h-auto rounded-lg cursor-crosshair bg-background"></canvas>
              </div>
              <button type="button" onClick={clearSignature} className="text-sm text-red-400 hover:underline mt-2">İmzayı Temizle</button>
            </div>
          </div>
          <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">Gönderi Oluştur ve Takip Numarası Al</button>
        </form>
      </div>
    </div>
  );
};

// Beyanname / Sözleşme Oluşturucu
const DeclarationDocument = () => {
  const [logo, setLogo] = useState('');
  const [date, setDate] = useState('2026-05-27');
  const [sender, setSender] = useState('John Smith');
  const [receiver, setReceiver] = useState('Vespucci Police Dept.');
  const [responsible, setResponsible] = useState('Frank Tenpenny');
  const [address, setAddress] = useState('Vespucci Blvd No: 12\nLos Santos');
  const [time, setTime] = useState('14:30');
  const [sigColor, setSigColor] = useState('#2A3F9D');

  const canvasRef = useRef(null);
  const canvasPaperRef = useRef(null);
  const phoneCaptureRef = useRef(null);
  const paperCaptureRef = useRef(null);

  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleLogoUpload = (event) => {
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    if (event.target.files[0]) {
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const getMousePos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  const syncSignature = () => {
    const canvas = canvasRef.current;
    const canvasPaper = canvasPaperRef.current;
    if (!canvas || !canvasPaper) return;
    const ctxPaper = canvasPaper.getContext('2d');
    ctxPaper.clearRect(0, 0, canvasPaper.width, canvasPaper.height);
    ctxPaper.drawImage(canvas, 0, 0, canvasPaper.width, canvasPaper.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const startDrawing = (e) => {
      isDrawing.current = true;
      [lastPos.current.x, lastPos.current.y] = getMousePos(canvas, e);
    };

    const stopDrawing = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      ctx.beginPath();
      syncSignature();
    };

    const draw = (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const [mouseX, mouseY] = getMousePos(canvas, e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();
      [lastPos.current.x, lastPos.current.y] = [mouseX, mouseY];
      syncSignature();
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [sigColor]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const canvasPaper = canvasPaperRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (canvasPaper) canvasPaper.getContext('2d').clearRect(0, 0, canvasPaper.width, canvasPaper.height);
  };

  const handleDownload = async (targetRef, fileName) => {
    if (!targetRef.current) return;
    html2canvas(targetRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: targetRef === paperCaptureRef ? '#ffffff' : null,
      logging: false
    }).then(canvasImage => {
      const a = document.createElement("a");
      a.href = canvasImage.toDataURL("image/png");
      a.download = `${fileName}_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };
  const formattedDate = date ? new Date(date).toLocaleDateString('tr-TR') : '';

  return (
    <Fragment>
      <style jsx global>{`
                .declaration-page { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; align-items: flex-start; max-width: 100%; margin: 0 auto; padding: 10px; box-sizing: border-box; }
                .panel { width: 350px; background: #1a1d22; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.08); position: sticky; top: 90px; z-index: 100; }
                .panel h3 { margin-top: 0; color: #ED3A32; text-transform: uppercase; font-weight: 800; border-bottom: 2px solid #ED3A32; padding-bottom: 10px; font-size: 18px;}
                .form-group { margin-bottom: 12px; }
                .form-group label { display: block; font-weight: 600; margin-bottom: 5px; font-size: 13px; color: #94a3b8; }
                .form-control { width: 100%; padding: 8px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; font-size: 13px; background-color: #0d0f14; color: #e2e8f0; }
                textarea.form-control { resize: vertical; min-height: 50px; }
                .btn-group-custom { display: flex; gap: 8px; margin-top: 5px;}
                .btn-panel { border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 12px; padding: 8px 12px;}
                .btn-clear { background-color: #f44336; color: white; }
                .btn-clear:hover { background-color: #d32f2f; }
                .btn-download { color: #fff; width: 100%; font-size: 14px; padding: 12px; margin-top: 10px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
                .btn-phone { background-color: #2A3F9D; }
                .btn-phone:hover { background-color: #1a2a6e; }
                .btn-paper { background-color: #444; }
                .btn-paper:hover { background-color: #222; }
                .phone-mockup { position: relative; max-width: 330px; width: 100%; height: auto; aspect-ratio: 330 / 720; background: #111; border-radius: 45px; padding: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 3px solid #222; user-select: none; flex-shrink: 0; }
                .phone-screen { background: #fdfdfd; width: 100%; height: 100%; border-radius: 35px; overflow: hidden; position: relative; display: flex; flex-direction: column; color: #333; }
                .notch { position: absolute; top: 0; left: 100px; width: 130px; height: 30px; background: #111; border-bottom-left-radius: 18px; border-bottom-right-radius: 18px; z-index: 999; }
                .notch::after { content: ''; position: absolute; top: 6px; left: 45px; width: 40px; height: 4px; background: #333; border-radius: 2px; }
                .app-header { background: #fdfdfd; padding: 35px 20px 10px; text-align: center; border-bottom: 2px solid #eee; }
                .app-logo { position: relative; width: 100%; max-width: 110px; height: auto; margin: 0 auto; display: block; object-fit: contain; }
                .doc-title { font-size: 14px; font-weight: 900; color: #2A3F9D; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;}
                .app-body { padding: 15px; flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: hidden; } 
                .info-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
                .info-label { font-size: 11px; color: #777; font-weight: bold; text-transform: uppercase; }
                .info-value { font-size: 12px; font-weight: 700; color: #111; text-align: right; max-width: 60%; word-wrap: break-word; }
                .address-box { background: white; padding: 10px; border-radius: 8px; border: 1px solid #eee; margin-top: 5px;}
                .declaration-box { background: #FFF5F5; border-left: 4px solid #F44336; padding: 10px; font-size: 11px; color: #444; line-height: 1.3; font-weight: 600; border-radius: 0 8px 8px 0; margin-top: 2px; }
                .signature-area { margin-top: auto; margin-bottom: 10px; text-align: center; background: white; padding: 10px; border-radius: 10px; border: 1px solid #e0e0e0; position: relative; width: 100%; }
                .sign-title { font-size: 10px; color: #777; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .sign-name { font-size: 13px; font-weight: 800; color: #111; margin-bottom: 5px;}
                .signature-canvas { border: 2px dashed #2A3F9D; border-radius: 8px; cursor: crosshair; background-color: #fafafa; width: 100%; max-width: 250px; height: 70px; display: block; margin: 0 auto; touch-action: none; } /* Keep this as is, it's for the canvas inside the phone mockup */
                .paper-mockup { max-width: 420px; width: 100%; height: auto; aspect-ratio: 210 / 297; background: #ffffff; border: 1px solid #ccc; box-shadow: 2px 2px 8px rgba(0,0,0,0.1), inset 0 0 50px rgba(0,0,0,0.02); padding: 35px 40px; font-family: 'Times New Roman', Times, serif; color: #111; position: relative; flex-shrink: 0; display: flex; flex-direction: column; }
                .paper-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .paper-logo { max-width: 100px; filter: grayscale(100%) contrast(150%); margin-bottom: 10px; }
                .paper-title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
                .paper-subtitle { font-size: 12px; color: #555; }
                .paper-body { flex: 1; display: flex; flex-direction: column; gap: 15px; }
                .paper-row { display: flex; justify-content: space-between; border-bottom: 1px dotted #888; padding-bottom: 5px; }
                .paper-label { font-weight: bold; font-size: 13px; }
                .paper-value { font-size: 13px; max-width: 65%; text-align: right; }
                .paper-address { margin-top: 5px; border: 1px solid #aaa; padding: 10px; background: #fafafa; font-size: 13px; }
                .paper-declaration { margin-top: 15px; font-size: 12px; line-height: 1.5; text-align: justify; font-style: italic; border-left: 3px solid #000; padding-left: 10px; }
                .paper-signature-section { margin-top: 25px; display: flex; justify-content: flex-end; }
                .paper-signature-box { width: 200px; text-align: center; }
                .paper-sign-label { font-weight: bold; font-size: 12px; margin-bottom: 5px; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 3px; }
                .paper-sign-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                .paper-canvas-container { border: 1px solid #888; background: #fff; height: 60px; position: relative; }
                .paper-canvas { width: 100%; height: 100%; pointer-events: none; }
            `}</style>
      <div className="declaration-page">
        <div className="panel">
          <h3>Beyanname Oluşturucu</h3>
          <div className="form-group"><label style={{ color: '#2A3F9D', fontWeight: 'bold' }}>Logo Yükle:</label><input type="file" className="form-control" accept="image/*" onChange={handleLogoUpload} /></div>
          <hr style={{ border: 0, borderTop: '1px solid #ddd', margin: '15px 0' }} />
          <div className="form-group"><label>Tarih:</label><input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label>Kargoyu Gönderen Kişi:</label><input type="text" className="form-control" value={sender} onChange={e => setSender(e.target.value)} /></div>
          <div className="form-group"><label>Alıcı Kişi/Kurum:</label><input type="text" className="form-control" value={receiver} onChange={e => setReceiver(e.target.value)} /></div>
          <div className="form-group"><label>Kargo Sorumlusu:</label><input type="text" className="form-control" value={responsible} onChange={e => setResponsible(e.target.value)} /></div>
          <div className="form-group"><label>Adres:</label><textarea className="form-control" value={address} onChange={e => setAddress(e.target.value)}></textarea></div>
          <div className="form-group"><label>Teslimat Saati:</label><input type="time" className="form-control" value={time} onChange={e => setTime(e.target.value)} /></div>
          <div className="form-group"><label style={{ color: '#4CAF50' }}>İmza (Telefona Çizin):</label><div className="btn-group-custom"><button className="btn-panel btn-clear" onClick={clearSignature}>🗑️ İmzayı Temizle</button><input type="color" className="form-control" value={sigColor} style={{ width: '50px', padding: '2px', height: '32px' }} onChange={e => setSigColor(e.target.value)} /></div></div>
          <button className="btn-download btn-phone" onClick={() => handleDownload(phoneCaptureRef, 'go_postal_telefon_imzali')}>📱 Telefon Görünümünü İndir</button>
          <button className="btn-download btn-paper" onClick={() => handleDownload(paperCaptureRef, 'go_postal_evrak_imzali')}>📄 Evrak Görünümünü İndir</button>
        </div>

        <div className="phone-mockup" ref={phoneCaptureRef}>
          <div className="notch"></div>
          <div className="phone-screen">
            <div className="app-header">
              <img className="app-logo" src={logo} alt="Sol panelden logo yükleyin" style={{ minHeight: '50px', background: logo ? 'transparent' : '#eee', borderRadius: '8px' }} />
              <div className="doc-title">Teslimat Beyannamesi</div>
            </div>
            <div className="app-body">
              <div className="info-row"><span className="info-label">Tarih:</span><span className="info-value">{formattedDate}</span></div>
              <div className="info-row"><span className="info-label">Gönderen:</span><span className="info-value">{sender}</span></div>
              <div className="info-row"><span className="info-label">Alıcı:</span><span className="info-value">{receiver}</span></div>
              <div className="info-row"><span className="info-label">Sorumlu:</span><span className="info-value">{responsible}</span></div>
              <div className="info-row"><span className="info-label">Tahmini Saat:</span><span className="info-value">{time}</span></div>
              <div className="address-box"><div className="info-label" style={{ marginBottom: '5px' }}>Teslimat Adresi:</div><div className="info-value" style={{ textAlign: 'left', maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: address.replace(/\n/g, '<br>') }}></div></div>
              <div className="declaration-box">"Bu kargonun içinde bulunan eşyanın tüm yasal yükümlülüğünün bana ait olduğunu doğruluyor, taşıyıcı kargo firması ve yetkilisiyle hiçbir bağlantısı olmadığını onaylıyorum."</div>
              <div className="signature-area">
                <div className="sign-title">Gönderen Onayı ve İmza</div>
                <div className="sign-name">{sender}</div>
                <canvas ref={canvasRef} className="signature-canvas" width="250" height="70"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div className="paper-mockup" ref={paperCaptureRef}>
          <div className="paper-header">
            {logo && <img className="paper-logo" src={logo} alt="Logo" />}
            <div className="paper-title">Teslimat Beyannamesi</div>
            <div className="paper-subtitle">Resmi Taşıma ve Yükümlülük Belgesi</div>
          </div>
          <div className="paper-body">
            <div className="paper-row"><span className="paper-label">Tarih:</span><span className="paper-value">{formattedDate}</span></div>
            <div className="paper-row"><span className="paper-label">Gönderen:</span><span className="paper-value">{sender}</span></div>
            <div className="paper-row"><span className="paper-label">Alıcı Kurum/Kişi:</span><span className="paper-value">{receiver}</span></div>
            <div className="paper-row"><span className="paper-label">Kargo Sorumlusu:</span><span className="paper-value">{responsible}</span></div>
            <div className="paper-row"><span className="paper-label">Teslimat Saati:</span><span className="paper-value">{time}</span></div>
            <div><span className="paper-label">Teslimat Adresi:</span><div className="paper-address" dangerouslySetInnerHTML={{ __html: address.replace(/\n/g, '<br>') }}></div></div>
            <div className="paper-declaration">İşbu belge ile; yukarıda bilgileri yer alan kargonun içerisinde bulunan eşyanın tüm yasal yükümlülüğünün tarafıma ait olduğunu kabul, beyan ve taahhüt ederim. İlgili kargonun içeriği sebebiyle doğabilecek her türlü hukuki ve cezai sorumluluk şahsıma ait olup, taşıyıcı kargo firması ve yetkili personelinin hiçbir sorumluluğu bulunmamaktadır.</div>
            <div className="paper-signature-section">
              <div className="paper-signature-box">
                <div className="paper-sign-label">Müşteri İmzası</div>
                <div className="paper-sign-name">{sender}</div>
                <div className="paper-canvas-container"><canvas ref={canvasPaperRef} className="paper-canvas" width="200" height="60"></canvas></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};


// Fatura / Makbuz Oluşturucu
const InvoiceDocument = ({ shipments, addNotification }) => {
  const [logo, setLogo] = useState(null);
  const [selectedTracking, setSelectedTracking] = useState('');
  const printableAreaRef = useRef(null);
  const logoUploadRef = useRef(null);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const downloadPNG = () => {
    alert('PNG indirme özelliği harita özelliği ile birlikte kaldırıldı.');
  };

  const handleIssueInvoice = async () => {
    if (!selectedTracking) {
      addNotification('Lütfen önce faturanın ait olduğu kargoyu seçin.', 'warning');
      return;
    }

    const shipment = shipments[selectedTracking];

    // Database ID kontrolü (Foreign Key hatasını önlemek için)
    const isDemoShipment = !shipment || !shipment.id || String(shipment.id).startsWith('demo-') || String(shipment.id).startsWith('local-');

    if (isDemoShipment) {
      addNotification('Bu kargo veritabanında bulunamadı veya yerel/demo bir veridir. Fatura oluşturuldu ancak veritabanına kaydedilmedi.', 'info');
      // Demo veri olsa bile eğer Discord ismi varsa bildirim gönder
      if (shipment && shipment.email) {
        sendDiscordNotification(
          `🧾 **Yeni Makbuz Oluşturuldu!** (Müşteri: ${shipment.email || shipment.sender})`,
          {
            title: "GoPostal Makbuz Detayı (Demo)",
            description: `**Takip No:** ${selectedTracking}\n**Gönderen:** ${shipment.sender}\n**Varış:** ${shipment.destination}\n\nBu demo bir faturadır ve veritabanına kaydedilmemiştir.`,
            color: 10181046, // Turuncu (Demo rengi)
            fields: [
              { name: "Alıcı Discord", value: shipment.email ? `@${shipment.email}` : "Belirtilmedi", inline: true }
            ],
            footer: { text: "GoPostal Yönetim Paneli" },
            timestamp: new Date().toISOString()
          }
        );
      }
      return; // Demo durumunda DB kaydına gitmeden çık
    }

    // Gerçek kargolar için Supabase kaydına devam et
    if (supabase) {
      const { error } = await supabase.from('invoices').insert([
        { shipment_id: shipment.id, created_at: new Date().toISOString() }
      ]);

      if (error) {
        console.error("Fatura Sistemi Hatası:", error);
        addNotification(`Fatura hatası: ${error.message}. Lütfen veritabanı bağlantısını kontrol edin.`, 'error');
        return;
      }
    }

    // Discord Bildirimi
    sendDiscordNotification(
      `🧾 **Yeni Makbuz Oluşturuldu!** (Müşteri: ${shipment.email || shipment.sender})`,
      {
        title: "GoPostal Makbuz Detayı",
        description: `**Takip No:** ${selectedTracking}\n**Gönderen:** ${shipment.sender}\n**Alıcı:** ${shipment.receiver}\n**Tarih:** ${new Date().toLocaleString('tr-TR')}`,
        color: 3066993,
        fields: [
          { name: "Durum", value: "Ödeme Onaylandı / Fatura Kesildi", inline: true },
          { name: "İlgili", value: shipment.email ? `@${shipment.email}` : "Belirtilmedi", inline: true }
        ]
      }
    );
    addNotification(`Fatura başarıyla kesildi. ${selectedTracking} sahibi Discord üzerinden bilgilendirilecek.`, 'success');
  };

  return (
    <>
      <style jsx>{`
                .invoice-root :global(.invoice-box) { max-width: 800px; margin: auto; padding: 40px; background: #fff; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1); border-radius: 8px; min-height: 1000px; color: #333; }
                .invoice-root :global([contenteditable="true"]) { border: 1px dashed transparent; padding: 2px 4px; border-radius: 3px; transition: all 0.2s; outline: none; }
                .invoice-root :global([contenteditable="true"]:hover), .invoice-root :global([contenteditable="true"]:focus) { background-color: #fffde7; border-color: #ffeb3b; }
                .invoice-root :global(header) { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #2D3A8C; padding-bottom: 20px; margin-bottom: 30px; }
                .invoice-root :global(.logo-container) { max-width: 250px; min-width: 150px; position: relative; }
                .invoice-root :global(#invoice-logo) { display: ${logo ? 'block' : 'none'}; max-width: 200px; max-height: 100px; object-fit: contain; }
                .invoice-root :global(#temp-logo-container) { cursor: pointer; display: ${logo ? 'none' : 'block'}; }
                .invoice-root :global(.temp-logo) { font-size: 50px; font-weight: bold; line-height: 1; letter-spacing: -3px; }
                .invoice-root :global(.temp-logo .g) { color: #E8312D; }
                .invoice-root :global(.temp-logo .p) { color: #2D3A8C; margin-left: -5px; }
                .invoice-root :global(.temp-logo-text) { font-size: 28px; color: #3a4147; font-weight: normal; margin-top: 5px; letter-spacing: -1px; }
                .invoice-root :global(.company-details) { text-align: right; font-size: 14px; color: #555; line-height: 1.6; }
                .invoice-root :global(.company-details h2) { margin: 0 0 5px 0; color: #333; font-size: 16px; }
                .invoice-root :global(.invoice-title-row) { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .invoice-root :global(.invoice-title) { font-size: 32px; color: #2D3A8C; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
                .invoice-root :global(.invoice-meta-table) { background: #f8f9fc; padding: 15px; border-radius: 5px; }
                .invoice-root :global(.invoice-meta-table table) { border-collapse: collapse; }
                .invoice-root :global(.invoice-meta-table td) { padding: 4px 10px; font-size: 14px; }
                .invoice-root :global(.invoice-meta-table td:first-child) { font-weight: bold; color: #555; text-align: right; border:none; }
                .invoice-root :global(.customer-info) { background-color: #f8f9fc; padding: 20px; border-left: 4px solid #E8312D; margin-bottom: 30px; border-radius: 0 5px 5px 0; }
                .invoice-root :global(.customer-info h3) { margin: 0 0 10px 0; color: #2D3A8C; font-size: 14px; text-transform: uppercase; }
                .invoice-root :global(.customer-info p) { margin: 0; font-size: 14px; color: #555; line-height: 1.6; }
                .invoice-root :global(.items-table) { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .invoice-root :global(.items-table th) { background-color: #2D3A8C; color: white; text-align: left; padding: 12px; font-size: 14px; text-transform: uppercase; }
                .invoice-root :global(.items-table td) { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                .invoice-root :global(.items-table th.center), .invoice-root :global(.items-table td.center) { text-align: center; }
                .invoice-root :global(.items-table th.right), .invoice-root :global(.items-table td.right) { text-align: right; }
                .invoice-root :global(.totals-container) { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                .invoice-root :global(.totals-table) { width: 300px; border-collapse: collapse; }
                .invoice-root :global(.totals-table th), .invoice-root :global(.totals-table td) { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
                .invoice-root :global(.totals-table th) { text-align: left; color: #555; font-weight: normal; }
                .invoice-root :global(.totals-table td) { text-align: right; font-weight: bold; }
                .invoice-root :global(.totals-table tr.grand-total th), .invoice-root :global(.totals-table tr.grand-total td) { color: #E8312D; font-size: 18px; font-weight: bold; border-bottom: none; padding-top: 15px; }
                .invoice-root :global(.footer) { text-align: center; font-size: 12px; color: #555; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
                .invoice-root :global(.exporting [contenteditable="true"]) { border: none !important; padding: 0 !important; background: transparent !important; }
            `}</style>
      <div className="invoice-root">
        <div className="flex justify-between items-center mb-4 p-4 bg-card rounded-lg border border-white/10">
          <div className="flex gap-4 items-center">
            <input type="file" ref={logoUploadRef} onChange={handleLogoUpload} accept="image/*" style={{ display: 'none' }} />
            <button className="btn-panel bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => logoUploadRef.current.click()}>+ Upload Logo</button>
            <span className="text-sm text-muted-fg italic">(Click on any text to edit)</span>
            <select
              value={selectedTracking}
              onChange={(e) => setSelectedTracking(e.target.value)}
              className="h-10 px-3 rounded bg-secondary border border-white/20 text-sm outline-none focus:ring-1 focus:ring-primary text-white"
            >
              <option value="">Kargo Seçin...</option>
              {Object.values(shipments).map(s => (
                <option key={s.trackingNumber} value={s.trackingNumber}>{s.trackingNumber} ({s.sender})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-panel bg-primary hover:brightness-90 text-white font-bold py-2 px-4 rounded" onClick={handleIssueInvoice}>📢 Faturayı Kes ve Bildir</button>
            <button className="btn-panel bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={downloadPNG}>🖼️ Download PNG</button>
            <button className="btn-panel bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => window.print()}>🖨️ Print / PDF</button>
          </div>
        </div>

        <div className="invoice-box" id="printable-area" ref={printableAreaRef}>
          <header>
            <div className="logo-container">
              <img id="invoice-logo" src={logo} alt="Company Logo" />
              <div id="temp-logo-container" onClick={() => logoUploadRef.current.click()} title="Click to Upload Logo">
                <div className="temp-logo" contentEditable="true" suppressContentEditableWarning><span className="g">G</span><span className="p">P</span></div>
                <div className="temp-logo-text" contentEditable="true" suppressContentEditableWarning>Postal<sup style={{ fontSize: '16px' }}>®</sup></div>
              </div>
            </div>
            <div className="company-details" contentEditable="true" suppressContentEditableWarning>
              <h2>GoPostal Logistics Inc.</h2>
              Port of South Los Santos, Pier 1<br />
              Los Santos, SA 90210<br />
              Tel: (323) 555-0188<br />
              Email: billing@gopostal.com
            </div>
          </header>
          <div className="invoice-title-row">
            <h1 className="invoice-title" contentEditable="true" suppressContentEditableWarning>INVOICE</h1>
            <div className="invoice-meta-table">
              <table><tbody>
                <tr><td contentEditable="true" suppressContentEditableWarning>Invoice #:</td><td contentEditable="true" suppressContentEditableWarning>GP-2026-00104</td></tr>
                <tr><td contentEditable="true" suppressContentEditableWarning>Invoice Date:</td><td contentEditable="true" suppressContentEditableWarning>May 26, 2026</td></tr>
                <tr><td contentEditable="true" suppressContentEditableWarning>Due Date:</td><td contentEditable="true" suppressContentEditableWarning>June 09, 2026</td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="customer-info" contentEditable="true" suppressContentEditableWarning>
            <h3>BILL TO</h3>
            <p><strong>Lester Crest & Associates</strong><br />La Puerta, Los Santos<br />Tax ID: 123 456 7890</p>
          </div>
          <table className="items-table">
            <thead><tr>
              <th contentEditable="true" suppressContentEditableWarning>Description / Service Detail</th>
              <th className="center" contentEditable="true" suppressContentEditableWarning>Quantity</th>
              <th className="right" contentEditable="true" suppressContentEditableWarning>Unit Price</th>
              <th className="right" contentEditable="true" suppressContentEditableWarning>Total</th>
            </tr></thead>
            <tbody>
              <tr><td contentEditable="true" suppressContentEditableWarning>International Cargo (Documents) - North Yankton</td><td className="center" contentEditable="true" suppressContentEditableWarning>2</td><td className="right" contentEditable="true" suppressContentEditableWarning>$450.00</td><td className="right" contentEditable="true" suppressContentEditableWarning>$900.00</td></tr>
              <tr><td contentEditable="true" suppressContentEditableWarning>Domestic Express Delivery - Blaine County</td><td className="center" contentEditable="true" suppressContentEditableWarning>5</td><td className="right" contentEditable="true" suppressContentEditableWarning>$120.00</td><td className="right" contentEditable="true" suppressContentEditableWarning>$600.00</td></tr>
              <tr><td contentEditable="true" suppressContentEditableWarning>Special Insurance & Handling</td><td className="center" contentEditable="true" suppressContentEditableWarning>7</td><td className="right" contentEditable="true" suppressContentEditableWarning>$25.00</td><td className="right" contentEditable="true" suppressContentEditableWarning>$175.00</td></tr>
            </tbody>
          </table>
          <div className="totals-container">
            <table className="totals-table"><tbody>
              <tr><th contentEditable="true" suppressContentEditableWarning>Subtotal:</th><td contentEditable="true" suppressContentEditableWarning>$1,675.00</td></tr>
              <tr><th contentEditable="true" suppressContentEditableWarning>Tax (8.25%):</th><td contentEditable="true" suppressContentEditableWarning>$138.19</td></tr>
              <tr className="grand-total"><th contentEditable="true" suppressContentEditableWarning>Grand Total:</th><td contentEditable="true" suppressContentEditableWarning>$1,813.19</td></tr>
            </tbody></table>
          </div>
          <div className="footer" contentEditable="true" suppressContentEditableWarning>
            <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>Bank Account Details (for Wire Transfer)</p>
            <p style={{ margin: '0' }}>Fleeca Bank, Acct #: 0000-123456, GoPostal Logistics Inc.</p>
            <p style={{ marginTop: '15px', fontStyle: 'italic' }}>Thank you for your business. This is a computer-generated document.</p>
          </div>
        </div>
      </div>
    </>
  );
};

// Teslimat Kanıtı Oluşturucu
const ProofOfDelivery = ({ shipments, setShipments, couriers, addNotification }) => {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [logo, setLogo] = useState(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState('https://via.placeholder.com/800x400/333333/555555?text=Lutfen+Bir+Fotograf+Yukleyin');

  const [plate, setPlate] = useState('');
  const [deliverer, setDeliverer] = useState('');
  const [tracking, setTracking] = useState('');
  const [datetime, setDatetime] = useState('');
  const [location, setLocation] = useState('');

  const captureAreaRef = useRef(null);

  const activeShipments = Object.values(shipments).filter(s => s.currentStatus === 'out_for_delivery');

  useEffect(() => {
    if (selectedShipment) {
      const courier = couriers[selectedShipment.courierId];
      setPlate('34 ABC 123');
      setDeliverer(courier ? courier.name : 'N/A');
      setTracking(selectedShipment.trackingNumber);
      setDatetime(new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' }));
      setLocation(selectedShipment.destination);
    }
  }, [selectedShipment, couriers]);

  const handleLogoUpload = (e) => { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = (event) => setLogo(event.target.result); reader.readAsDataURL(e.target.files[0]); } };
  const handlePhotoUpload = (e) => { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = (event) => setDeliveryPhoto(event.target.result); reader.readAsDataURL(e.target.files[0]); } };

  const downloadPNG = async () => {
    if (!captureAreaRef.current) return;
    html2canvas(captureAreaRef.current, { scale: 3, useCORS: true, backgroundColor: null, logging: false })
      .then(canvasImage => {
        const a = document.createElement("a");
        a.href = canvasImage.toDataURL("image/png");
        a.download = `delivery_proof_${tracking}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  const handleApproveAndArchive = async () => {
    if (!selectedShipment) return;

    const tracking = selectedShipment.trackingNumber;

    // Kanıt görselini yakala
    const canvas = await html2canvas(captureAreaRef.current, { scale: 2, useCORS: true });

    canvas.toBlob(async (blob) => {
      const updatedEvents = [
        { timestamp: getFormattedTimestamp(), location: selectedShipment.destination, description: 'Paket teslim edildi. Teslimat kanıtı oluşturuldu.', status: 'delivered' },
        ...selectedShipment.events
      ];

      setShipments(prev => ({
        ...prev,
        [tracking]: { ...prev[tracking], currentStatus: 'delivered', events: updatedEvents }
      }));

      if (supabase) {
        await supabase.from('shipments').update({ currentStatus: 'delivered', events: updatedEvents }).eq('trackingNumber', tracking);
      }

      // Discord'a görseli ve bilgileri gönder
      await sendDiscordNotification(
        `✅ **Teslimat Başarıyla Tamamlandı:** ${tracking} (Müşteri: @${selectedShipment.email || selectedShipment.sender})`,
        getDiscordStatusEmbed('delivered', selectedShipment.sender, tracking, selectedShipment.email),
        blob
      );

      // Görseli indir
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `delivery_proof_${tracking}.png`;
      a.click();

      addNotification(`${tracking} numaralı kargo teslim edildi ve kanıt Discord'a iletildi.`, 'success');
      setSelectedShipment(null);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <h3 className="text-xl font-bold mb-4">Aktif Kargolar (Dağıtımda)</h3>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
          {activeShipments.length > 0 ? activeShipments.map(ship => (
            <button key={ship.trackingNumber} onClick={() => setSelectedShipment(ship)} className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedShipment?.trackingNumber === ship.trackingNumber ? 'bg-primary/10 border-primary/50' : 'bg-card border-white/[0.08] hover:border-white/20'}`}>
              <p className="font-mono text-primary text-sm">{ship.trackingNumber}</p>
              <p className="font-semibold text-xs">{ship.origin} → {ship.destination}</p>
            </button>
          )) : <p className="text-sm text-muted-fg italic">Dağıtımda olan aktif kargo bulunmuyor.</p>}
        </div>
      </div>
      <div className="lg:col-span-2">
        {selectedShipment ? (
          <div>
            <h3 className="text-xl font-bold mb-4">Teslimat Kanıtı Oluştur</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="w-full border-2 border-dashed border-accent text-accent p-2 rounded-lg font-bold cursor-pointer transition-all hover:bg-accent/10 text-center">
                Logo Yükle
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              <label className="w-full border-2 border-dashed border-green-500 text-green-500 p-2 rounded-lg font-bold cursor-pointer transition-all hover:bg-green-500/10 text-center">
                Teslimat Fotoğrafı Yükle
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            {/* Preview Area */}
            <div ref={captureAreaRef} className="relative w-[750px] h-[380px] bg-black rounded-[45px] p-3 border-2 border-gray-800 shadow-lg mx-auto select-none flex">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[30px] h-[160px] bg-black rounded-r-[20px] z-20"></div>
              <div className="bg-black w-full h-full rounded-[35px] overflow-hidden relative flex flex-col">
                <div className="bg-white/95 h-[55px] flex items-center justify-between px-[30px] pl-[50px] border-b-2 border-blue-800 z-10">
                  {logo && <img src={logo} className="max-w-[120px] max-h-10 object-contain" alt="Logo" />}
                  <div className="text-base font-black text-blue-800 uppercase tracking-widest">Teslimat Kanıtı</div>
                </div>
                <div className="flex-1 relative flex justify-center items-center bg-gray-800 overflow-hidden">
                  <img src={deliveryPhoto} className="absolute w-full h-full object-cover z-0 filter contrast-110 brightness-95" alt="Kargo" />
                  {logo && <img src={logo} className="absolute w-1/2 max-w-[300px] opacity-15 z-[1] pointer-events-none mix-blend-overlay" alt="Logo Watermark" />}
                  <div className="absolute bottom-4 left-5 z-[4] text-white/80 font-mono text-[13px] [text-shadow:1px_1px_3px_rgba(0,0,0,0.9)] pointer-events-none">
                    <div>TRACK: {tracking}</div>
                    <div>{datetime}</div>
                    <div>{location}</div>
                  </div>
                </div>
                <div className="absolute bottom-4 right-5 z-[4] text-white font-mono text-[13px] text-right [text-shadow:1px_1px_3px_rgba(0,0,0,0.9)] bg-black/40 p-2 rounded border border-white/20 pointer-events-none"><div>PLAKA: {plate}</div><div>PERSONEL: {deliverer}</div></div>
                <div className="absolute right-6 z-[5] flex flex-col items-center justify-center bg-black/70 p-4 rounded-2xl border-2 border-green-600/40 backdrop-blur-sm shadow-2xl animate-popIn">
                  <div className="text-green-500 text-5xl leading-none mb-1 [text-shadow:0_0_15px_rgba(76,175,80,0.8)]">✓</div><div className="text-white text-xl font-black tracking-widest uppercase text-center leading-tight">Teslim<br />Edildi!</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <button onClick={downloadPNG} className="btn-panel bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">📸 Kanıt Görüntüsünü İndir</button>
              <button onClick={handleApproveAndArchive} className="btn-panel bg-primary hover:brightness-90 text-white font-bold py-2 px-4 rounded">✓ Onayla ve Arşivle</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-card border-2 border-dashed border-white/10 rounded-xl">
            <p className="text-muted-fg">Kanıt oluşturmak için bir kargo seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Abonelik Formu
const SubscriptionForm = ({ onSubscribe, addNotification }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    purpose: 'general',
  });
  const [isSigned, setIsSigned] = useState(false);
  const signatureCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0, lastY = 0;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDrawing = (e) => { isDrawing = true; const { x, y } = getPos(e);[lastX, lastY] = [x, y]; };
    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      setIsSigned(true);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      [lastX, lastY] = [x, y];
    };
    const stopDrawing = () => { isDrawing = false; ctx.beginPath(); };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setIsSigned(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSigned) { addNotification('Lütfen sözleşmeyi imzalayın.', 'error'); return; }
    const signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
    onSubscribe({ ...formData, signatureDataUrl });
  };

  return (
    <div className="pb-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Kurumsal Abonelik Başvurusu</h1>
        <p className="text-muted-fg mb-8">Sürekli gönderileriniz için avantajlı abonelik paketlerimize başvurun.</p>
        <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-white/[0.08] rounded-2xl p-8">
          <input type="text" name="companyName" placeholder="Şirket Adı" value={formData.companyName} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
          <input type="text" name="contactPerson" placeholder="Yetkili Kişi" value={formData.contactPerson} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
          <input type="tel" name="phone" placeholder="Telefon Numarası" value={formData.phone} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
          <textarea name="address" placeholder="Şirket Adresi" value={formData.address} onChange={handleInputChange} rows="3" className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary" required />
          <div><label className="text-sm font-medium text-muted-fg mb-1 block">Genel Gönderim Amacı</label><select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary"><option value="general">Genel Kargo</option><option value="documents">Evrak/Belge</option><option value="ecommerce">E-Ticaret</option><option value="special">Özel Kargo</option></select></div>
          <div><h3 className="text-lg font-semibold">Yetkili İmzası</h3><p className="text-xs text-muted-fg mb-2">Lütfen aşağıdaki alana imzanızı atarak sözleşmeyi onaylayın.</p><div className="bg-secondary border border-white/[0.08] rounded-xl p-1"><canvas ref={signatureCanvasRef} width="400" height="150" className="w-full h-auto rounded-lg cursor-crosshair bg-background"></canvas></div><button type="button" onClick={clearSignature} className="text-sm text-red-400 hover:underline mt-2">İmzayı Temizle</button></div>
          <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">Abonelik Başvurusunu Gönder</button>
        </form>
      </div>
    </div>
  );
};

// Mail Oluşturma Bileşeni
const ComposeMail = ({ couriers, sendInternalMail, uploadMailImage, addNotification, onCancel, initialData }) => {
  const [formData, setFormData] = useState(initialData || { receiverId: '', subject: '', body: '', imageUrl: '', parentMailId: null, forwardedFromId: null });
  const [imageFile, setImageFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData(initialData || { receiverId: '', subject: '', body: '', imageUrl: '', parentMailId: null, forwardedFromId: null });
    setImageFile(null);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.receiverId || !formData.subject || !formData.body) {
      addNotification('Lütfen tüm zorunlu alanları doldurun.', 'error');
      return;
    }

    setIsSending(true);
    let uploadedImageUrl = formData.imageUrl; // Forward edilen mailin görseli varsa koru
    if (imageFile) {
      uploadedImageUrl = await uploadMailImage(imageFile);
      if (!uploadedImageUrl) {
        addNotification('Görsel yüklenirken bir hata oluştu.', 'error');
        setIsSending(false);
        return;
      }
    }

    const success = await sendInternalMail({ ...formData, imageUrl: uploadedImageUrl });
    setIsSending(false);
    if (success) onCancel(); // Başarılı olursa formu kapat
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-white/10">
      <h3 className="text-xl font-bold mb-4">Yeni Mail Oluştur</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-fg block mb-1">Kime</label>
          <select name="receiverId" value={formData.receiverId} onChange={handleChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary text-sm" required>
            <option value="">Alıcı Seçin...</option>
            <option value="all" className="text-primary font-bold">📢 Tüm Çalışanlar (Toplu Mail)</option>
            {Object.values(couriers).map(c => (
              <option key={c.id} value={c.id}>{c.name} ({RANK_LABELS[c.rank || 'driver']})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-fg block mb-1">Konu</label>
          <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary text-sm" required />
        </div>
        <div>
          <label className="text-xs text-muted-fg block mb-1">Mesaj</label>
          <textarea name="body" value={formData.body} onChange={handleChange} rows="6" className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary text-sm" required />
        </div>
        <div>
          <label className="text-xs text-muted-fg block mb-1">Görsel Ekle (Opsiyonel)</label>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary text-sm text-left text-muted-fg hover:bg-white/5 transition-colors">
            {imageFile ? imageFile.name : (formData.imageUrl ? 'Mevcut Görsel: ' + formData.imageUrl.split('/').pop() : 'Görsel Seç...')}
          </button>
          {imageFile && <p className="text-xs text-muted-fg mt-1">Seçilen dosya: {imageFile.name}</p>}
          {formData.imageUrl && !imageFile && <p className="text-xs text-muted-fg mt-1">Mevcut görsel kullanılacak.</p>}
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-xl bg-secondary text-white/80 font-semibold text-sm hover:bg-white/[0.05] transition-colors">İptal</button>
          <button type="submit" className="h-10 flex-1 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all" disabled={isSending}>{isSending ? 'Gönderiliyor...' : 'Gönder'}</button>
        </div>
      </form>
    </div>
  );
};

// Mail Görüntüleme Bileşeni
const ViewMail = ({ mail, sender, receiver, onBack, onReply, onForward }) => {
  return ( // mail.id'yi kontrol ederek boş mail gösterimini engelle
    <div className="bg-card p-6 rounded-xl border border-white/10">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-fg hover:text-foreground">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
        Geri Dön
      </button>
      <h3 className="text-xl font-bold mb-2">{mail?.subject || 'Konu Yok'}</h3>
      <p className="text-sm text-muted-fg mb-4">Gönderen: {sender?.name || 'Bilinmiyor'} | Alıcı: {receiver?.name || 'Bilinmiyor'} | {new Date(mail.created_at).toLocaleString()}</p>
      <div className="prose prose-invert max-w-none text-foreground/80 leading-relaxed mb-6">
        <p>{mail.body}</p>
        {mail.image_url && <img src={mail.image_url} alt="Ekli Görsel" className="max-w-full h-auto rounded-lg mt-4" />}
      </div>
      <div className="flex gap-3">
        <button onClick={() => onReply(mail)} className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium">Cevapla</button>
        <button onClick={() => onForward(mail)} className="px-4 py-2 rounded-md bg-secondary text-white/80 text-sm font-medium">Yönlendir</button>
      </div>
    </div>
  );
};

const STEPS = [
  { key: "received", label: "Alındı" },
  { key: "processing", label: "İşlemde" },
  { key: "transit", label: "Yolda" },
  { key: "out_for_delivery", label: "Dağıtımda" },
  { key: "delivered", label: "Teslim" }
];
const STEP_ORDER = ["received", "processing", "transit", "out_for_delivery", "delivered"];

// Gelişmiş Admin Paneli Bileşeni
const AdminPanel = ({ shipments, setShipments, pages, setPages, couriers, setCouriers, siteConfig, setSiteConfig, subscribers, setSubscribers, branches, setBranches, contactMessages, setContactMessages, courierCalls, setCourierCalls, partners, setPartners, internalMails, sendInternalMail, uploadMailImage, addNotification, clearMailsCount }) => {
  const [activeTab, setActiveTab] = useState('manage');
  const [newShipment, setNewShipment] = useState({ trackingNumber: '', sender: '', receiver: '', origin: '', destination: '', weight: '', courierId: '', email: '', rank: 'driver' });
  const [editingPage, setEditingPage] = useState(null); // { group: 'kurumsal', slug: 'hakkimizda' }
  const [pageData, setPageData] = useState({ title: '', content: '' });
  const [adminMailContentState, setAdminMailContentState] = useState('list'); // 'list', 'compose', 'view'
  const [selectedAdminMail, setSelectedAdminMail] = useState(null); // Görüntülenen veya cevaplanan mail nesnesi
  const [archiveSearchDate, setArchiveSearchDate] = useState('');
  const [newCourier, setNewCourier] = useState({ name: '', phone: '', photo: '', role: '', startDate: '', status: 'active', notes: '', rank: 'driver', discord_tag: '' });
  const [editingCourierId, setEditingCourierId] = useState(null);
  const [selectedHRProfile, setSelectedHRProfile] = useState(null);
  const [hrSearch, setHrSearch] = useState('');
  const [viewingShipment, setViewingShipment] = useState(null);
  const [viewingSubscriber, setViewingSubscriber] = useState(null);
  const [editorView, setEditorView] = useState('edit');
  const [hrView, setHrView] = useState('profile');
  const [newBranch, setNewBranch] = useState({ name: '', address: '' });
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [newPartner, setNewPartner] = useState({ name: '', logoUrl: '' });
  const [newHeaderLink, setNewHeaderLink] = useState({ title: '', slug: '' });

  const [isMobileAdminMenuOpen, setIsMobileAdminMenuOpen] = useState(false);
  // Yeni personel başvurusu bildirimi için
  const pendingCouriers = Object.values(couriers).filter(c => c.status === 'pending_approval');
  const prevPendingCount = useRef(pendingCouriers.length);

  useEffect(() => {
    if (activeTab === 'mailbox') clearMailsCount();
  }, [activeTab, clearMailsCount]);

  const hrStats = {
    total: Object.keys(couriers).length,
    active: Object.values(couriers).filter(c => c.status === 'active').length,
    pending: pendingCouriers.length
  };

  useEffect(() => {
    if (pendingCouriers.length > prevPendingCount.current) {
      addNotification('Yeni bir personel kayıt talebi geldi!', 'info');
    }
    prevPendingCount.current = pendingCouriers.length;
  }, [pendingCouriers.length, addNotification]);

  const handleEditPageClick = (groupKey, slug) => {
    setEditingPage({ group: groupKey, slug });
    setPageData({ title: pages[groupKey].items[slug].title, content: pages[groupKey].items[slug].content });
    window.scrollTo(0, 0);
  };

  const handlePageDataChange = (e) => {
    const { name, value } = e.target;
    setPageData(prev => ({ ...prev, [name]: value }));
  };

  const handlePageContentChange = (content) => {
    setPageData(prev => ({ ...prev, content }));
  };

  const handleAddNewPage = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const group = e.target.group.value;
    if (!title || !group) return;

    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (pages[group]?.items[slug]) {
      addNotification('Bu başlığa sahip bir sayfa zaten mevcut.', 'error');
      return;
    }

    if (supabase) {
      const { error } = await supabase.from('pages').insert([{ slug, group_key: group, title, content: '<!-- İçeriği buraya yazın -->' }]);
      if (error) {
        addNotification(`Sayfa oluşturulurken hata: ${error.message}`, 'error');
        return;
      }
    }

    setPages(prev => {
      const newPages = JSON.parse(JSON.stringify(prev));
      newPages[group].items[slug] = { title: title, content: '<!-- İçeriği buraya yazın -->' };
      return newPages;
    });

    addNotification(`'${title}' sayfası başarıyla oluşturuldu.`, 'success');
    e.target.reset();
  };

  const handleDeletePage = async (groupKey, slug) => {
    if (window.confirm(`'${pages[groupKey].items[slug].title}' sayfasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      if (supabase) {
        const { error } = await supabase.from('pages').delete().eq('slug', slug).eq('group_key', groupKey);
        if (error) {
          addNotification(`Silme işlemi başarısız: ${error.message}`, 'error');
          return;
        }
      }
      setPages(prev => {
        const newPages = JSON.parse(JSON.stringify(prev));
        delete newPages[groupKey].items[slug];
        return newPages;
      });
      if (editingPage && editingPage.slug === slug) {
        setEditingPage(null);
      }
    }
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (supabase) {
      const { error } = await supabase.from('pages').upsert({
        slug: editingPage.slug,
        group_key: editingPage.group,
        title: pageData.title,
        content: pageData.content
      }, { onConflict: 'slug' });

      if (error) {
        addNotification(`Güncelleme hatası: ${error.message}`, 'error');
        return;
      }
    }
    setPages(prev => {
      const newPages = JSON.parse(JSON.stringify(prev));
      newPages[editingPage.group].items[editingPage.slug] = pageData;
      return newPages;
    });
    addNotification(`'${pageData.title}' sayfası başarıyla güncellendi.`, 'success');
    setEditingPage(null);
  };

  const handleNewCourierChange = (e) => {
    const { name, value } = e.target;
    setNewCourier(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCourier = async (e) => {
    e.preventDefault();
    if (!newCourier.name || !newCourier.phone || !newCourier.photo) {
      addNotification('Lütfen tüm çalışan bilgilerini doldurun.', 'error');
      return;
    }

    if (editingCourierId) {
      if (supabase) {
        await supabase.from('couriers').update(newCourier).eq('id', editingCourierId);
      }
      setCouriers(prev => ({ ...prev, [editingCourierId]: { ...newCourier, id: editingCourierId } }));
      addNotification('Çalışan bilgileri güncellendi.', 'success');
    } else {
      const courierId = newCourier.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (couriers[courierId] || Object.values(couriers).some(c => c.phone === newCourier.phone)) {
        addNotification('Bu isim veya telefon numarası ile bir çalışan zaten mevcut. Lütfen farklı bilgiler deneyin.', 'error');
        return;
      }
      const courierData = { id: courierId, ...newCourier, status: 'pending_approval' };
      if (supabase) {
        await supabase.from('couriers').insert([courierData]);
      }
      setCouriers(prev => ({ ...prev, [courierId]: courierData }));
      addNotification('Yeni çalışan başarıyla eklendi.', 'success');
    }

    setNewCourier({ name: '', phone: '', photo: '', role: '', startDate: '', status: 'active', notes: '', rank: 'driver', discord_tag: '' });
    setEditingCourierId(null);
    setHrView('profile');
  };

  const handleStartEditCourier = (courier) => {
    setEditingCourierId(courier.id);
    setNewCourier({ name: courier.name, phone: courier.phone, photo: courier.photo, role: courier.role || '', discord_tag: courier.discord_tag || '', startDate: courier.startDate || '', status: courier.status || 'active', notes: courier.notes || '', rank: courier.rank || 'driver' });
    setHrView('form');
  };

  const handleDeleteCourier = async (courierId) => {
    if (window.confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
      const isUsed = Object.values(shipments).some(s => s.courierId === courierId);
      if (isUsed) {
        addNotification('Bu kurye aktif bir kargoya atanmış, bu nedenle silinemez. Önce kargoyu başka bir kuryeye atayın.', 'error');
        return;
      }
      if (supabase) {
        await supabase.from('couriers').delete().eq('id', courierId);
      }
      setCouriers(prev => {
        const { [courierId]: _, ...remaining } = prev;
        return remaining;
      });
      if (selectedHRProfile?.id === courierId) setSelectedHRProfile(null);
      addNotification('Çalışan silindi.', 'success');
    }
  };

  const handleSiteConfigChange = (e) => setSiteConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleHRProfileUpdate = async (id, field, value) => {
    setCouriers(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setSelectedHRProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveHRProfile = async (courier) => {
    if (supabase) {
      const { error } = await supabase.from('couriers').update({
        status: courier.status,
        rank: courier.rank,
        discord_tag: courier.discord_tag,
        startDate: courier.startDate,
        notes: courier.notes
      }).eq('id', courier.id);

      if (error) addNotification('Güncelleme başarısız: ' + error.message, 'error');
      else addNotification('Personel bilgileri başarıyla güncellendi.', 'success');
    }
  };

  const handleSubscriberStatusChange = async (id, newStatus) => {
    if (supabase) {
      await supabase.from('subscribers').update({ status: newStatus }).eq('id', id);
    }
    setSubscribers(prev => ({
      ...prev,
      [id]: { ...prev[id], status: newStatus }
    }));
    setViewingSubscriber(prev => ({ ...prev, status: newStatus }));
  };

  const handleNewBranchChange = (e) => {
    const { name, value } = e.target;
    setNewBranch(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.address) {
      alert('Lütfen tüm şube bilgilerini ve koordinatları doldurun.');
      return;
    }

    if (editingBranchId) {
      if (supabase) {
        await supabase.from('branches').update(newBranch).eq('id', editingBranchId);
      }
      setBranches(prev => ({
        ...prev,
        [editingBranchId]: { ...prev[editingBranchId], ...newBranch }
      }));
      alert('Şube bilgileri güncellendi.');
    } else {
      const branchId = newBranch.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (branches[branchId]) {
        alert('Bu isimle bir şube zaten mevcut.');
        return;
      }
      if (supabase) {
        await supabase.from('branches').insert([{ id: branchId, ...newBranch }]);
      }
      setBranches(prev => ({
        ...prev,
        [branchId]: { id: branchId, ...newBranch }
      }));
      alert('Yeni şube eklendi.');
    }
    setNewBranch({ name: '', address: '' });
    setEditingBranchId(null);
  };

  const handleStartEditBranch = (branch) => {
    setEditingBranchId(branch.id);
    setNewBranch({ name: branch.name, address: branch.address, coordinates: branch.coordinates });
    document.getElementById('admin-branch-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteContactMessage = async (msgId) => {
    if (window.confirm('Bu iletişim talebini silmek istediğinizden emin misiniz?')) {
      if (supabase) {
        await supabase.from('contact_messages').delete().eq('id', msgId);
      }
      setContactMessages(prev => {
        const { [msgId]: _, ...remaining } = prev;
        return remaining;
      });
    }
  };
  const handleDeleteBranch = async (branchId) => {
    if (window.confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) {
      if (supabase) {
        await supabase.from('branches').delete().eq('id', branchId);
      }
      setBranches(prev => { const { [branchId]: _, ...remaining } = prev; return remaining; });
      addNotification('Şube silindi.', 'success');
    }
  };

  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.logoUrl) return;
    const partnerId = `partner-${Date.now()}`;
    if (supabase) {
      await supabase.from('partners').insert([{ id: partnerId, ...newPartner }]);
    }
    setPartners(prev => ({ ...prev, [partnerId]: { id: partnerId, ...newPartner } }));
    setNewPartner({ name: '', logoUrl: '' });
  };

  const handleDeletePartner = async (partnerId) => {
    if (window.confirm('Bu iş ortağını silmek istediğinizden emin misiniz?')) {
      if (supabase) {
        await supabase.from('partners').delete().eq('id', partnerId);
      }
      setPartners(prev => {
        const { [partnerId]: _, ...remaining } = prev;
        return remaining;
      });
    }
  };

  const handleAddNewHeaderLink = async (e) => {
    e.preventDefault();
    if (!newHeaderLink.title || !newHeaderLink.slug) return;
    const updatedNav = [...siteConfig.headerNav, newHeaderLink];
    setSiteConfig(prev => ({ ...prev, headerNav: updatedNav }));
    if (supabase) {
      await supabase.from('site_settings').update({ value: JSON.stringify(updatedNav) }).eq('key', 'headerNav');
    }
    setNewHeaderLink({ title: '', slug: '' });
  };

  const handleDeleteHeaderLink = async (index) => {
    if (window.confirm('Bu menü linkini silmek istediğinizden emin misiniz?')) {
      const updatedNav = siteConfig.headerNav.filter((_, i) => i !== index);
      setSiteConfig(prev => ({ ...prev, headerNav: updatedNav }));
      if (supabase) {
        await supabase.from('site_settings').update({ value: JSON.stringify(updatedNav) }).eq('key', 'headerNav');
      }
    }
  };

  const handleNewPartnerChange = (e) => {
    const { name, value } = e.target;
    setNewPartner(prev => ({ ...prev, [name]: value }));
  };


  const handleCourierAssignment = async (trackingNumber, courierId) => {
    if (supabase) {
      await supabase.from('shipments').update({ courierId }).eq('trackingNumber', trackingNumber);
    }
    setShipments(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        courierId: courierId
      }
    }));
    if (viewingShipment && viewingShipment.trackingNumber === trackingNumber) {
      setViewingShipment(prev => ({ ...prev, courierId: courierId }));
    }
  };

  const handleAssignCourier = async (callId, courierId) => {
    if (!courierId) {
      addNotification("Lütfen bir kurye seçin.", 'error');
      return;
    }
    if (supabase) {
      await supabase.from('courier_calls').update({ status: 'assigned', courierId }).eq('id', callId);
    }
    setCourierCalls(prev => ({
      ...prev,
      [callId]: {
        ...prev[callId],
        status: 'assigned',
        courierId: courierId
      }
    }));
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewShipment(prev => ({ ...prev, [name]: value }));
  };

  const handleAddShipment = async (e) => {
    e.preventDefault();
    if (!newShipment.courierId) {
      alert('Lütfen bir kurye seçin.');
      return;
    }
    const newTrackingNumber = newShipment.trackingNumber.trim().toUpperCase();
    if (!newTrackingNumber) {
      alert('Takip numarası zorunludur.');
      return;
    }

    const updatedEvents = [{
      timestamp: getFormattedTimestamp(),
      location: newShipment.origin,
      description: 'Paket göndericiden teslim alındı.',
      status: 'received'
    }];

    const newEntry = {
      ...newShipment,
      trackingNumber: newTrackingNumber,
      currentStatus: 'received',
      estimatedDelivery: 'Hesaplanıyor...',
      created_at: new Date().toISOString(),
      events: updatedEvents
    };

    setShipments(prev => ({ ...prev, [newTrackingNumber]: newEntry }));

    if (supabase) {
      const { data, error } = await supabase.from('shipments').insert([newEntry]).select();
      if (error) {
        console.error("Kargo kayıt hatası:", error);
        addNotification(`Kargo kaydedilemedi: ${error.message}`, 'error');
        return;
      }
      if (data?.[0]) {
        setShipments(prev => ({ ...prev, [newTrackingNumber]: { ...newEntry, ...data[0] } }));
      }
    } else {
      // Demo modu için yerel ID ata
      setShipments(prev => ({ ...prev, [newTrackingNumber]: { ...newEntry, id: 'local-' + Date.now() } }));
    }

    addNotification(`${newTrackingNumber} takip numaralı kargo başarıyla eklendi.`, 'success');
    // Formu sıfırla
    setNewShipment({ trackingNumber: '', sender: '', receiver: '', origin: '', destination: '', weight: '', courierId: '', email: '', rank: 'driver' });
  };

  const handleStatusUpdate = async (trackingNumber, newStatus) => {
    const shipment = shipments[trackingNumber];
    if (!shipment) return;

    const updatedEvents = [
      {
        timestamp: getFormattedTimestamp(),
        location: 'Admin Panel',
        description: `Durum admin tarafından güncellendi: ${STATUS_CFG[newStatus].label}`,
        status: newStatus
      },
      ...(shipment.events || [])
    ];

    setShipments(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        currentStatus: newStatus,
        events: updatedEvents
      }
    }));

    if (supabase) {
      const { error } = await supabase.from('shipments').update({
        currentStatus: newStatus,
        events: updatedEvents
      }).eq('trackingNumber', trackingNumber);

      if (error) {
        console.error("Güncelleme hatası:", error);
        addNotification("Durum güncellenirken bir hata oluştu.", "error");
        return;
      }

      // Discord Bildirimi
      sendDiscordNotification(
        `🔔 **${trackingNumber}** için yeni kargo güncellemesi!`,
        getDiscordStatusEmbed(newStatus, shipment.sender, trackingNumber, shipment.email)
      );
    }
  };

  const handleApproveCourier = async (id) => {
    setCouriers(prev => ({ ...prev, [id]: { ...prev[id], status: 'active' } }));
    if (supabase) {
      await supabase.from('couriers').update({ status: 'active' }).eq('id', id);
    }
  };


  const menuItems = [
    { id: 'manage', label: 'Kargoları Yönet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 22H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 1.14-1.8L9.5 3.45a2 2 0 0 1 2.06 0L17.86 5.7a2 2 0 0 1 1.14 1.8V14" /><path d="M14 14a2 2 0 0 1-2-2V9.5a2 2 0 0 1 1.14-1.8L18.5 5.45a2 2 0 0 1 2.06 0L22 6.5" /><path d="M14 22V10" /><path d="M14 14h6v8h-6z" /><path d="M2 17h3" /><path d="M7 17h3" /></svg> },
    { id: 'archive', label: 'Kargo Arşivi', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg> },
    { id: 'add', label: 'Yeni Kargo Ekle', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
    { id: 'delivery_proof', label: 'Teslimat Kanıtı', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg> },
    { id: 'pages', label: 'Sayfaları Yönet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
    { id: 'courier_requests', label: 'Kurye Talepleri', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 22H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 1.14-1.8L9.5 3.45a2 2 0 0 1 2.06 0L17.86 5.7a2 2 0 0 1 1.14 1.8V14" /><path d="M14 14a2 2 0 0 1-2-2V9.5a2 2 0 0 1 1.14-1.8L18.5 5.45a2 2 0 0 1 2.06 0L22 6.5" /><path d="M14 22V10" /><path d="M14 14h6v8h-6z" /><path d="M2 17h3" /><path d="M7 17h3" /></svg> },
    { id: 'hr', label: 'Personel Yönetimi', badge: pendingCouriers.length > 0 ? pendingCouriers.length : null, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: 'subscribers', label: 'Aboneler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: 'declaration', label: 'Sözleşme', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m10 13-2 2 2 2"></path><path d="m14 13 2 2-2 2"></path></svg> },
    { id: 'partners', label: 'İş Ortakları', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg> },
    { id: 'contact', label: 'İletişim Talepleri', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> },
    { id: 'branches', label: 'Şubeleri Yönet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg> },
    { id: 'mailbox', label: 'Mail Kutusu', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
    { id: 'invoice', label: 'Makbuz', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect></svg> },
    { id: 'settings', label: 'Genel Ayarlar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg> },
  ];

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 py-8">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileAdminMenuOpen(!isMobileAdminMenuOpen)}
        className="md:hidden fixed top-20 left-4 z-50 p-2 bg-card border border-white/[0.08] rounded-lg text-muted-fg hover:text-foreground transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileAdminMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileAdminMenuOpen(false)}></div>}

      <aside className={`md:col-span-1 fixed md:sticky top-24 z-50 md:z-auto bg-card md:bg-transparent h-full md:h-auto transform ${isMobileAdminMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 md:w-auto border-r md:border-r-0 border-white/[0.08] md:border-transparent`}>
        <nav className="flex flex-col p-4 md:p-0 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setViewingShipment(null);
                setEditingPage(null);
                setIsMobileAdminMenuOpen(false); // Close menu on item click
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 md:w-full text-left ${activeTab === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-fg hover:bg-white/5 hover:text-foreground'
                }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <span className="ml-auto bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="md:col-span-3">
        {viewingShipment ? (
          <div>
            <button onClick={() => setViewingShipment(null)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-fg hover:text-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Tüm Kargolara Geri Dön
            </button>
            <h3 className="text-xl font-bold mb-6">Kargo Detayları: <span className="text-primary font-mono">{viewingShipment.trackingNumber}</span></h3>
            <div className="space-y-4 bg-card p-6 rounded-xl border border-white/10">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-fg">Gönderen</p><p className="font-semibold">{viewingShipment.sender}</p></div>
                <div><p className="text-xs text-muted-fg">Alıcı</p><p className="font-semibold">{viewingShipment.receiver}</p></div>
                <div><p className="text-xs text-muted-fg">Çıkış</p><p className="font-semibold">{viewingShipment.origin}</p></div>
                <div><p className="text-xs text-muted-fg">Varış</p><p className="font-semibold">{viewingShipment.destination}</p></div>
                <div><p className="text-xs text-muted-fg">Ağırlık</p><p className="font-semibold">{viewingShipment.weight}</p></div>
                <div>
                  <p className="text-xs text-muted-fg">Atanan Kurye</p>
                  <select
                    value={viewingShipment.courierId || ''}
                    onChange={(e) => handleCourierAssignment(viewingShipment.trackingNumber, e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm focus:ring-primary/50 focus:border-primary/50"
                  >
                    <option value="">Kurye Seçin...</option>
                    {Object.values(couriers).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {viewingShipment.signatureDataUrl && viewingShipment.signatureDataUrl.startsWith('data:image') && (
                <div className="pt-4">
                  <h4 className="text-base font-semibold mb-2">Gönderici İmzası</h4>
                  <div className="bg-secondary p-2 rounded-lg border border-white/10 inline-block">
                    <img src={viewingShipment.signatureDataUrl} alt="İmza" className="h-24 w-auto bg-white rounded" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'manage' && (
              <div>
                <h3 className="text-xl font-bold mb-6">Tüm Kargolar</h3>
                <div className="space-y-4">
                  {Object.values(shipments).filter(s => !['delivered', 'failed'].includes(s.currentStatus)).map(ship => {
                    const courier = couriers[ship.courierId];
                    return (
                      <div key={ship.trackingNumber} className="bg-card rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/[0.08]">
                        <div className="flex items-center gap-4 flex-1">
                          {courier && <img src={courier.photo} alt={courier.name} className="w-10 h-10 rounded-full object-cover" />}
                          <div>
                            <p className="font-mono text-primary text-sm">{ship.trackingNumber}</p>
                            <p className="font-semibold text-sm">{ship.origin} → {ship.destination}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select value={ship.currentStatus} onChange={(e) => handleStatusUpdate(ship.trackingNumber, e.target.value)} className="bg-secondary border border-white/[0.08] rounded-md px-3 py-1.5 text-sm focus:ring-primary/50 focus:border-primary/50">
                            {Object.entries(STATUS_CFG).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <button onClick={() => setViewingShipment(ship)} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90 active:scale-95 transition-all">Detaylar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'archive' && (
              <div className="animate-popIn">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                  Tamamlanan Kargo Arşivi
                </h3>
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end bg-card/50 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="flex-1">
                    <label className="text-xs text-muted-fg mb-1.5 block uppercase font-black tracking-widest">Kayıt Tarihine Göre Ara</label>
                    <div className="relative">
                      <input type="date" value={archiveSearchDate} onChange={(e) => setArchiveSearchDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary text-sm focus:ring-2 focus:ring-primary/50 transition-all outline-none" />
                    </div>
                  </div>
                  <button onClick={() => setArchiveSearchDate('')} className="h-12 px-6 rounded-xl bg-secondary text-white font-bold text-xs uppercase hover:bg-white/10 transition-all active:scale-95 border border-white/5">Sıfırla</button>
                </div>
                <div className="space-y-3">
                  {Object.values(shipments)
                    .filter(s => ['delivered', 'failed'].includes(s.currentStatus))
                    .filter(s => !archiveSearchDate || (s.created_at && s.created_at.startsWith(archiveSearchDate)))
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                    .map(ship => (
                      <div key={ship.trackingNumber} className="bg-card rounded-xl p-5 flex items-center justify-between border border-white/[0.05] hover:border-primary/30 hover:bg-primary/[0.02] transition-all group">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-mono text-primary font-black">{ship.trackingNumber}</p>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${STATUS_CFG[ship.currentStatus].color} ${STATUS_CFG[ship.currentStatus].bg} ${STATUS_CFG[ship.currentStatus].border}`}>{STATUS_CFG[ship.currentStatus].label}</span>
                          </div>
                          <p className="font-bold text-sm text-foreground/90">{ship.origin} <span className="text-muted-fg mx-1">→</span> {ship.destination}</p>
                          <p className="text-[10px] text-muted-fg mt-2 flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Kayıt: {new Date(ship.created_at || Date.now()).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <button onClick={() => setViewingShipment(ship)} className="h-10 px-5 rounded-lg bg-white/5 text-white text-xs font-black hover:bg-primary hover:text-white transition-all active:scale-95">DETAY</button>
                      </div>
                    ))}
                  {Object.values(shipments).filter(s => ['delivered', 'failed'].includes(s.currentStatus)).length === 0 && (
                    <div className="text-center py-20 bg-card/30 rounded-2xl border-2 border-dashed border-white/5">
                      <p className="text-muted-fg italic text-sm">Arşivde henüz kargo bulunmuyor.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'add' && (
              <form onSubmit={handleAddShipment} className="max-w-xl mx-auto space-y-5 animate-popIn">
                <h3 className="text-xl font-bold mb-2">Yeni Manuel Kargo</h3>
                <div className="space-y-4 bg-card/30 p-6 rounded-2xl border border-white/5">
                  <input type="text" name="trackingNumber" placeholder="Takip Numarası" value={newShipment.trackingNumber} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary font-mono" required />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <input type="text" name="sender" placeholder="Gönderici (Veya Abone Seçin)" value={newShipment.sender} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      {Object.values(subscribers).filter(s => s.status === 'active').length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-white/10 rounded-lg shadow-xl hidden group-focus-within:block max-h-40 overflow-y-auto">
                          <p className="p-2 text-[10px] text-muted-fg uppercase font-bold border-b border-white/5">Kayıtlı Aboneler</p>
                          {Object.values(subscribers).filter(s => s.status === 'active').map(sub => (
                            <button key={sub.id} type="button" onClick={() => setNewShipment(prev => ({...prev, sender: sub.companyName}))} className="w-full text-left px-4 py-2 text-sm hover:bg-primary/20 transition-colors">
                              {sub.companyName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="text" name="receiver" placeholder="Alıcı" value={newShipment.receiver} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="origin" placeholder="Çıkış" value={newShipment.origin} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                    <input type="text" name="destination" placeholder="Varış" value={newShipment.destination} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                  </div>
                  <input type="text" name="email" placeholder="Müşteri Discord" value={newShipment.email} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                  <div className="flex items-center gap-3">
                    <select name="courierId" value={newShipment.courierId} onChange={handleInputChange} className="flex-grow h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required>
                      <option value="">Kurye seçin...</option>
                      {Object.values(couriers).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {newShipment.courierId && <img src={couriers[newShipment.courierId]?.photo} className="w-12 h-12 rounded-full object-cover border-2 border-primary" />}
                  </div>
                </div>
                <button type="submit" className="h-14 w-full rounded-2xl bg-primary text-white font-black tracking-widest uppercase hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95">Kargoyu Kaydet</button>
              </form>
            )}

            {activeTab === 'pages' && (
              <div>
                {editingPage ? (
                  <form onSubmit={handleSavePage}>
                    <h3 className="text-xl font-bold mb-6">"{pages[editingPage.group].items[editingPage.slug].title}" Sayfasını Düzenle</h3>
                    <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
                      <button type="button" onClick={() => setEditorView('edit')} className={`px-4 py-1.5 text-sm rounded-md font-semibold ${editorView === 'edit' ? 'bg-accent text-white' : 'text-muted-fg hover:bg-white/5'}`}>Düzenle</button>
                      <button type="button" onClick={() => setEditorView('preview')} className={`px-4 py-1.5 text-sm rounded-md font-semibold ${editorView === 'preview' ? 'bg-accent text-white' : 'text-muted-fg hover:bg-white/5'}`}>Önizleme</button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-fg mb-1 block">Sayfa Başlığı</label>
                        <input type="text" name="title" value={pageData.title} onChange={handlePageDataChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      </div>
                      {editorView === 'edit' ? (
                        <div>
                          <label className="text-xs text-muted-fg mb-1 block">Sayfa İçeriği (HTML)</label>
                          <textarea
                            value={pageData.content}
                            onChange={(e) => handlePageContentChange(e.target.value)}
                            rows="12"
                            className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary font-mono text-sm leading-relaxed text-foreground"
                            required
                          />
                          <p className="text-xs text-muted-fg mt-2">HTML etiketleri kullanabilirsinizz. Örn: <code className="text-xs bg-black/20 px-1 py-0.5 rounded ml-1">&lt;img src="..." style="float:left; margin-right:1rem; width:150px;"&gt;</code></p>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs text-muted-fg mb-1 block">Sayfa Önizlemesi</label>
                          <div className="prose prose-invert max-w-none text-foreground/80 leading-relaxed p-6 rounded-xl border border-white/[0.08] bg-secondary min-h-[288px]">
                            <div dangerouslySetInnerHTML={{ __html: pageData.content }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button type="submit" className="h-12 px-8 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">Değişiklikleri Kaydet</button>
                      <button type="button" onClick={() => setEditingPage(null)} className="h-12 px-8 rounded-xl bg-secondary text-white/80 font-semibold text-sm hover:bg-white/[0.05] transition-colors">İptal</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <p className="text-muted-fg max-w-2xl">WordPress benzeri bir mantıkla, sitenin alt kısmında (footer) yer alan statik sayfaların içeriklerini buradan düzenleyebilirsiniz. Düzenlemek istediğiniz sayfanın butonuna tıklamanız yeterlidir.</p>
                    {Object.entries(pages).map(([groupKey, groupData]) => (
                      <div key={groupKey}>
                        <h3 className="font-semibold text-primary mb-3 uppercase tracking-wider text-sm">{groupData.title}</h3>
                        <div className="space-y-2">
                          {Object.entries(groupData.items).map(([slug, item]) => (
                            <div key={slug} className="bg-card rounded-lg p-3 px-4 flex items-center justify-between border border-white/[0.08] hover:border-white/[0.15] transition-colors">
                              <p className="font-medium">{item.title}</p>
                              <button onClick={() => handleEditPageClick(groupKey, slug)} className="text-sm px-4 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90 active:scale-95 transition-all">Düzenle</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hr' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-card border border-white/5 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-muted-fg uppercase font-bold">Toplam</p>
                      <p className="text-xl font-bold text-foreground">{hrStats.total}</p>
                    </div>
                    <div className="bg-card border border-white/5 p-3 rounded-xl text-center font-bold">
                      <p className="text-[10px] text-green-500 uppercase">Aktif</p>
                      <p className="text-xl text-green-400">{hrStats.active}</p>
                    </div>
                    <div className="bg-card border border-white/5 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-yellow-500 uppercase font-bold">Onay</p>
                      <p className="text-xl text-yellow-400">{hrStats.pending}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Personel ara..."
                        value={hrSearch}
                        onChange={(e) => setHrSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-secondary text-sm focus:ring-primary/50"
                      />
                      <svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    <button onClick={() => { setEditingCourierId(null); setNewCourier({ name: '', phone: '', photo: '', role: '', startDate: '', status: 'active', notes: '', rank: 'driver', discord_tag: '' }); setHrView('form'); }} className="w-full h-10 rounded-xl bg-accent text-white font-bold text-sm hover:brightness-90 transition-all flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>
                      Yeni Personel Ekle
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.values(couriers)
                      .filter(c => c.name.toLowerCase().includes(hrSearch.toLowerCase()))
                      .map(c => (
                        <button key={c.id} onClick={() => { setSelectedHRProfile(c); setHrView('profile'); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedHRProfile?.id === c.id ? 'bg-primary/10 border-primary/40' : 'bg-card border-white/[0.05] hover:border-white/20'}`}>
                          <img src={c.photo} alt={c.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white/5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${c.rank === 'admin' ? 'bg-red-500/20 text-red-400' :
                                c.rank === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-muted text-muted-fg'
                                }`}>
                                {RANK_LABELS[c.rank || 'driver']}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-muted-fg'}`}></span>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold mb-4 border-t border-white/10 pt-6">Onay Bekleyen Personeller</h4>
                    {pendingCouriers.length > 0 ? (
                      <div className="space-y-2">
                        {pendingCouriers.map(c => (
                          <div key={c.id} className="bg-card p-3 rounded-lg flex justify-between items-center border border-yellow-500/20">
                            <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-fg">{c.phone}</p></div>
                            <div className="flex gap-2"><button onClick={() => handleApproveCourier(c.id)} className="text-xs px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 font-semibold">Onayla</button><button onClick={() => handleDeleteCourier(c.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 font-semibold">Reddet</button></div>
                          </div>
                        ))}
                      </div>
                    ) : (<p className="text-sm text-muted-fg italic">Onay bekleyen personel bulunmuyor.</p>)}
                  </div>
                </div>
                <div className="lg:col-span-3">
                  {hrView === 'form' ? (
                    <div>
                      <Fragment>
                        <h3 className="text-xl font-bold mb-6">{editingCourierId ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</h3>
                        <form onSubmit={handleSaveCourier} className="space-y-4">
                          <input type="text" name="name" placeholder="İsim Soyisim" value={newCourier.name} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                          <input type="text" name="phone" placeholder="Telefon Numarası" value={newCourier.phone} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                          <input type="text" name="photo" placeholder="Fotoğraf URL'si" value={newCourier.photo} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                          <input type="text" name="role" placeholder="Görevi (örn: Kurye)" value={newCourier.role || ''} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                          <input type="text" name="discord_tag" placeholder="Discord Adresi (örn: user#0000)" value={newCourier.discord_tag || ''} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                          <input type="date" name="startDate" value={newCourier.startDate || ''} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                          <select name="status" value={newCourier.status || 'active'} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary"><option value="active">Aktif</option><option value="on_leave">İzinli</option><option value="terminated">İşten Ayrıldı</option></select>
                          <select name="rank" value={newCourier.rank || 'driver'} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary">
                            {Object.entries(RANK_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          <textarea name="notes" placeholder="Çalışan hakkında notlar..." value={newCourier.notes || ''} onChange={handleNewCourierChange} rows="3" className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary"></textarea>
                          <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setHrView('profile')} className="h-10 flex-1 rounded-xl bg-secondary text-white/80 font-semibold text-sm hover:bg-white/[0.05] transition-colors">İptal</button>
                            <button type="submit" className="h-10 flex-1 rounded-xl bg-accent text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">{editingCourierId ? 'Değişiklikleri Kaydet' : 'Personeli Ekle'}</button>
                          </div>
                        </form>
                      </Fragment>
                    </div>
                  ) : selectedHRProfile ? (
                    <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-6">
                          <img src={selectedHRProfile.photo} alt={selectedHRProfile.name} className="w-24 h-24 rounded-full object-cover border-4 border-white/10" />
                          <div>
                            <h4 className="text-2xl font-bold">{selectedHRProfile.name}</h4>
                            <p className="text-primary font-semibold">{selectedHRProfile.role} <span className="text-muted-fg text-xs ml-2">({RANK_LABELS[selectedHRProfile.rank || 'driver']})</span></p>
                            <p className="text-sm text-muted-fg font-mono">{selectedHRProfile.phone}</p>
                            {selectedHRProfile.discord_tag && <p className="text-xs text-blue-400 font-semibold mt-1">🎮 {selectedHRProfile.discord_tag}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleStartEditCourier(selectedHRProfile)} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90">Düzenle</button>
                          <button onClick={() => handleDeleteCourier(selectedHRProfile.id)} className="text-sm px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 font-medium hover:bg-red-500/30">Sil</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="text-xs text-muted-fg">Durum</label>
                          <select value={selectedHRProfile.status} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'status', e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm">
                            <option value="active">Aktif</option><option value="on_leave">İzinli</option><option value="terminated">İşten Ayrıldı</option>
                          </select>
                        </div>
                        <div><label className="text-xs text-muted-fg">Yetki Seviyesi (Rütbe)</label>
                          <select value={selectedHRProfile.rank || 'driver'} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'rank', e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm">
                            {Object.entries(RANK_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div><label className="text-xs text-muted-fg">Discord Adresi</label><input type="text" value={selectedHRProfile.discord_tag || ''} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'discord_tag', e.target.value)} placeholder="örn: user#1234" className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" /></div>
                        <div><label className="text-xs text-muted-fg">İşe Başlama Tarihi</label><input type="date" value={selectedHRProfile.startDate} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'startDate', e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" /></div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-fg">Performans ve Genel Notlar</label>
                        <textarea value={selectedHRProfile.notes} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'notes', e.target.value)} rows="5" className="w-full mt-1 p-3 rounded-md border border-white/[0.08] bg-secondary text-sm leading-relaxed"></textarea>
                      </div>
                      <button onClick={() => handleSaveHRProfile(selectedHRProfile)} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:brightness-90 transition-all shadow-lg shadow-primary/20">Değişiklikleri Veritabanına Kaydet</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-card border-2 border-dashed border-white/10 rounded-xl">
                      <p className="text-muted-fg">Detayları görüntülemek için bir personel seçin veya yeni bir personel ekleyin.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'subscribers' && (
              viewingSubscriber ? (
                <div>
                  <button onClick={() => setViewingSubscriber(null)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-fg hover:text-foreground">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                    Tüm Abonelere Geri Dön
                  </button>
                  <h3 className="text-xl font-bold mb-6">Abone Detayları: <span className="text-primary">{viewingSubscriber.companyName}</span></h3>
                  <div className="space-y-4 bg-card p-6 rounded-xl border border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-xs text-muted-fg">Şirket Adı</p><p className="font-semibold">{viewingSubscriber.companyName}</p></div>
                      <div><p className="text-xs text-muted-fg">Yetkili Kişi</p><p className="font-semibold">{viewingSubscriber.contactPerson}</p></div>
                      <div><p className="text-xs text-muted-fg">Telefon</p><p className="font-semibold">{viewingSubscriber.phone}</p></div>
                      <div><p className="text-xs text-muted-fg">Adres</p><p className="font-semibold">{viewingSubscriber.address}</p></div>
                      <div><p className="text-xs text-muted-fg">Gönderim Amacı</p><p className="font-semibold">{viewingSubscriber.purpose}</p></div>
                      <div><p className="text-xs text-muted-fg">Durum</p><select value={viewingSubscriber.status} onChange={e => handleSubscriberStatusChange(viewingSubscriber.id, e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm"><option value="pending">Beklemede</option><option value="active">Aktif</option><option value="cancelled">Feshedildi</option></select></div>
                      <div>
                        <p className="text-xs text-muted-fg">GTAW ID (Eşleştirme)</p>
                        <input 
                          type="text" 
                          placeholder="Hesap ID Girin"
                          value={viewingSubscriber.gtaw_id || ''} 
                          onChange={async (e) => {
                            const val = e.target.value;
                            setSubscribers(prev => ({...prev, [viewingSubscriber.id]: {...prev[viewingSubscriber.id], gtaw_id: val}}));
                            setViewingSubscriber(prev => ({...prev, gtaw_id: val}));
                            if (supabase) await supabase.from('subscribers').update({ gtaw_id: val }).eq('id', viewingSubscriber.id);
                          }}
                          className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" 
                        />
                      </div>
                    </div>
                    {viewingSubscriber.signatureDataUrl && <div className="pt-4"><h4 className="text-base font-semibold mb-2">Yetkili İmzası</h4><div className="bg-secondary p-2 rounded-lg border border-white/10 inline-block"><img src={viewingSubscriber.signatureDataUrl} alt="İmza" className="h-24 w-auto bg-white rounded" /></div></div>}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold mb-6">Tüm Aboneler</h3>
                  <div className="space-y-2">
                    {Object.values(subscribers).map(sub => (
                      <div key={sub.id} className="bg-card rounded-lg p-4 flex items-center justify-between border border-white/[0.08]">
                        <div><p className="font-semibold">{sub.companyName}</p><p className="text-sm text-muted-fg">{sub.contactPerson}</p></div>
                        <div className="flex items-center gap-3"><span className={`px-2 py-1 text-xs rounded-full ${sub.status === 'active' ? 'bg-green-500/20 text-green-400' : sub.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{sub.status}</span><button onClick={() => setViewingSubscriber(sub)} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium">Detaylar</button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {activeTab === 'delivery_proof' && (
              <ProofOfDelivery shipments={shipments} setShipments={setShipments} couriers={couriers} addNotification={addNotification} />
            )}

            {activeTab === 'declaration' && (
              <DeclarationDocument />
            )}

            {activeTab === 'invoice' && (
              <InvoiceDocument shipments={shipments} addNotification={addNotification} />
            )}

            {activeTab === 'contact' && (
              <div>
                <h3 className="text-xl font-bold mb-6">İletişim Formu Mesajları</h3>
                <div className="space-y-4">
                  {Object.keys(contactMessages).length > 0 ? (
                    Object.values(contactMessages).map(msg => (
                      <div key={msg.id} className="bg-card p-4 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{msg.name} {msg.surname}</p>
                            <p className="text-xs text-muted-fg">{new Date(msg.createdAt).toLocaleString('tr-TR')}</p>
                          </div>
                          <button onClick={() => handleDeleteContactMessage(msg.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 font-medium">Sil</button>
                        </div>
                        <p className="text-sm mt-3 pt-3 border-t border-white/5">{msg.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-card rounded-lg border-2 border-dashed border-white/10">
                      <p className="text-muted-fg">Henüz iletişim mesajı yok.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'mailbox' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Kurumsal Mail Kutusu</h3>
                  <button onClick={() => { setAdminMailContentState('compose'); setSelectedAdminMail(null); }} className="text-sm px-4 py-2 rounded-md bg-accent text-white font-medium hover:brightness-90 transition-all">Yeni Mesaj Oluştur</button>
                </div>
                {adminMailContentState === 'compose' ? (
                  <ComposeMail couriers={couriers} sendInternalMail={sendInternalMail} uploadMailImage={uploadMailImage} addNotification={addNotification} onCancel={() => setAdminMailContentState('list')} initialData={selectedAdminMail ? { receiverId: selectedAdminMail.sender_id, subject: `Yanıt: ${selectedAdminMail.subject}`, body: `\n\n--- Orijinal Mesaj ---\n${selectedAdminMail.body}`, parentMailId: selectedAdminMail.id } : null} />
                ) : adminMailContentState === 'view' && selectedAdminMail ? (
                  <ViewMail mail={selectedAdminMail} sender={couriers[selectedAdminMail.sender_id]} receiver={couriers[selectedAdminMail.receiver_id]} onBack={() => { setAdminMailContentState('list'); setSelectedAdminMail(null); }} onReply={(mailToReply) => { setAdminMailContentState('compose'); setSelectedAdminMail(mailToReply); }} onForward={(mailToForward) => { setAdminMailContentState('compose'); setSelectedAdminMail(mailToForward); }} />
                ) : (
                  <div className="space-y-2">
                    {Object.values(internalMails).length > 0 ? Object.values(internalMails).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(mail => (
                      <div key={mail.id} onClick={() => { setSelectedAdminMail(mail); setAdminMailContentState('view'); }} className="bg-card p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${mail.read_at ? 'bg-transparent' : 'bg-primary shadow-[0_0_8px_rgba(237,58,50,0.5)]'}`}></div>
                          <div>
                            <p className="font-bold text-foreground">{mail.subject}</p>
                            <p className="text-xs text-muted-fg">Gönderen: {couriers[mail.sender_id]?.name || 'Sistem'}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-fg font-mono uppercase">{new Date(mail.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )) : <div className="text-center py-20 bg-card rounded-xl border-2 border-dashed border-white/10"><p className="text-muted-fg italic">Henüz bir mesaj bulunmuyor.</p></div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'branches' && (
              <div>
                <h3 className="text-xl font-bold mb-6">Şubeleri Yönet</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 id="admin-branch-form" className="font-semibold">{editingBranchId ? 'Şubeyi Düzenle' : 'Yeni Şube Ekle'}</h4>
                    <form onSubmit={handleSaveBranch} className="space-y-4">
                      <input type="text" name="name" placeholder="Şube Adı" value={newBranch.name} onChange={handleNewBranchChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      <input type="text" name="address" placeholder="Şube Adresi" value={newBranch.address} onChange={handleNewBranchChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      <div className="flex gap-2">
                        {editingBranchId && <button type="button" onClick={() => { setEditingBranchId(null); setNewBranch({ name: '', address: '' }); }} className="h-12 px-6 rounded-xl bg-secondary text-white/80 font-semibold text-sm">İptal</button>}
                        <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">{editingBranchId ? 'Değişiklikleri Kaydet' : 'Yeni Şube Ekle'}</button>
                      </div>
                    </form>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Mevcut Şubeler</h4>
                    {Object.values(branches).map(branch => (
                      <div key={branch.id} className="bg-card p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{branch.name}</p>
                          <p className="text-xs text-muted-fg">{branch.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleStartEditBranch(branch)} className="text-xs px-3 py-1.5 rounded-md bg-accent text-white font-medium">Düzenle</button>
                          <button onClick={() => handleDeleteBranch(branch.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 font-medium">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'partners' && (
              <div>
                <h3 className="text-xl font-bold mb-6">İş Ortaklarını Yönet</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-card p-6 rounded-xl border border-white/10">
                    <h4 className="font-semibold mb-4">Yeni Ortak Ekle</h4>
                    <form onSubmit={handleSavePartner} className="space-y-4">
                      <input type="text" name="name" placeholder="Ortak Adı" value={newPartner.name} onChange={handleNewPartnerChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      <input type="text" name="logoUrl" placeholder="Logo URL (örn: /partners/logo.png)" value={newPartner.logoUrl} onChange={handleNewPartnerChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                      <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm">Yeni Ortak Ekle</button>
                    </form>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold mb-4">Mevcut Ortaklar</h4>
                    {Object.values(partners).map(partner => (
                      <div key={partner.id} className="bg-card p-3 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <img src={partner.logoUrl} alt={partner.name} className="h-8 w-auto max-w-[100px] object-contain filter grayscale brightness-150" />
                          <p className="font-semibold text-sm">{partner.name}</p>
                        </div>
                        <button onClick={() => handleDeletePartner(partner.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 font-medium">Sil</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'courier_requests' && (
              <div>
                <h3 className="text-xl font-bold mb-6">Kurye Çağrı Yönetimi</h3>
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Bekleyen Talepler</h4>
                  <div className="space-y-4">
                    {Object.values(courierCalls).filter(c => c.status === 'pending').length > 0 ? Object.values(courierCalls).filter(c => c.status === 'pending').map(call => (
                      <div key={call.id} className="bg-card p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                          <p className="font-bold">{call.name} {call.surname}</p>
                          <p className="text-sm text-muted-fg">{call.address}</p>
                          <p className="text-xs text-muted-fg font-mono mt-1">{call.phone}</p>
                          <p className="text-xs text-muted-fg mt-2">{new Date(call.timestamp).toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <select id={`courier-select-${call.id}`} className="flex-grow w-full h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm">
                            <option value="">Kurye Ata...</option>
                            {Object.values(couriers).filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button onClick={() => handleAssignCourier(call.id, document.getElementById(`courier-select-${call.id}`).value)} className="h-10 px-4 rounded-md bg-accent text-white text-sm font-semibold">Ata</button>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-fg italic">Bekleyen kurye talebi yok.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">Atanmış Talepler</h4>
                  <div className="space-y-4">
                    {Object.values(courierCalls).filter(c => c.status === 'assigned').length > 0 ? Object.values(courierCalls).filter(c => c.status === 'assigned').map(call => (
                      <div key={call.id} className="bg-card/50 p-4 rounded-lg border border-green-500/20 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{call.name} {call.surname}</p>
                          <p className="text-sm text-muted-fg">{call.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-fg">Atanan Kurye</p>
                          <p className="font-semibold text-green-400">{couriers[call.courierId]?.name || 'Bilinmiyor'}</p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-fg italic">Atanmış kurye talebi yok.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-xl font-bold mb-6">Genel Site Ayarları</h3>
                <div className="max-w-lg space-y-4">
                  <div>
                    <label className="text-xs text-muted-fg mb-1 block">Footer Telefon Numarası</label>
                    <input type="text" name="phone" value={siteConfig.phone} onChange={handleSiteConfigChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-fg mb-1 block">Footer E-posta Adresi</label>
                    <input type="email" name="email" value={siteConfig.email} onChange={handleSiteConfigChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                  </div>
                  <p className="text-sm text-muted-fg pt-2">Not: Değişiklikler anında yansır. Kaydet butonu bulunmamaktadır.</p>

                  <div className="pt-6">
                    <h4 className="font-semibold mb-4 border-t border-white/10 pt-6">Üst Menü Linkleri</h4>
                    <div className="space-y-2 mb-6">
                      {siteConfig.headerNav.map((link, index) => (
                        <div key={index} className="bg-secondary p-2 px-4 rounded-lg flex justify-between items-center">
                          <p className="text-sm font-medium">{link.title} <span className="text-muted-fg font-mono text-xs">({link.slug})</span></p>
                          <button onClick={() => handleDeleteHeaderLink(index)} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 font-medium">Sil</button>
                        </div>
                      ))}
                    </div>
                    <h4 className="font-semibold mb-4">Yeni Menü Linki Ekle</h4>
                    <form onSubmit={handleAddNewHeaderLink} className="flex items-end gap-2">
                      <div className="flex-grow"><label className="text-xs text-muted-fg mb-1 block">Başlık</label><input type="text" name="title" value={newHeaderLink.title} onChange={e => setNewHeaderLink({ ...newHeaderLink, title: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" required /></div>
                      <div className="flex-grow"><label className="text-xs text-muted-fg mb-1 block">Slug</label><input type="text" name="slug" value={newHeaderLink.slug} onChange={e => setNewHeaderLink({ ...newHeaderLink, slug: e.target.value })} className="w-full h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" required /></div>
                      <button type="submit" className="h-10 px-4 rounded-md bg-accent text-white text-sm font-semibold">Ekle</button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Çalışan Paneli
function EmployeePanel({ shipments, setShipments, courier, couriers, courierCalls, setCourierCalls, handleCreatePublicShipment, internalMails, sendInternalMail, uploadMailImage, addNotification, clearMailsCount }) {
  const myShipments = Object.values(shipments).filter(s => s.courierId === courier.id && !['delivered', 'failed'].includes(s.currentStatus));
  const allActiveShipments = Object.values(shipments).filter(s => !['delivered', 'failed'].includes(s.currentStatus));
  const [activeTab, setActiveTab] = useState('my_shipments');
  const [employeeMailContentState, setEmployeeMailContentState] = useState('list'); // 'list', 'compose', 'view'
  const [selectedEmployeeMail, setSelectedEmployeeMail] = useState(null); // Görüntülenen veya cevaplanan mail nesnesi
  const [archiveSearchDate, setArchiveSearchDate] = useState('');
  const [viewingShipment, setViewingShipment] = useState(null);

  useEffect(() => {
    if (activeTab === 'mailbox') clearMailsCount();
  }, [activeTab, clearMailsCount]);

  // Yetki Kontrolü
  const rank = courier.rank || 'driver';
  const canViewAll = ['staff', 'manager'].includes(rank);
  const canIssueInvoice = rank === 'manager';
  const canViewRequests = ['staff', 'manager'].includes(rank);

  const menuItems = [
    { id: 'my_shipments', label: 'Üzerimdeki Kargolar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { id: 'all_active', label: 'Aktif Kargolar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { id: 'archive', label: 'Arşiv', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg> },
    canViewAll && { id: 'all_shipments', label: 'Tüm Kargolar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 22H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 1.14-1.8L9.5 3.45a2 2 0 0 1 2.06 0L17.86 5.7a2 2 0 0 1 1.14 1.8V14" /></svg> },
    canViewAll && { id: 'create_shipment', label: 'Yeni Kargo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
    canViewRequests && { id: 'requests', label: 'Kurye Talepleri', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.7 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg> },
    canIssueInvoice && { id: 'invoices', label: 'Makbuz/Fatura', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /></svg> },
    canIssueInvoice && { id: 'proof', label: 'Teslimat Kanıtı', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg> },
    { id: 'mailbox', label: 'Mesajlar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> }
  ].filter(Boolean);

  const handleStatusUpdate = async (trackingNumber, newStatus) => {
    const shipment = shipments[trackingNumber];
    if (!shipment) return;

    const updatedEvents = [
      {
        timestamp: getFormattedTimestamp(),
        location: `${courier.name} (${RANK_LABELS[rank]}) tarafından güncellendi`,
        description: `Durum personel tarafından güncellendi: ${STATUS_CFG[newStatus].label}`,
        status: newStatus
      },
      ...(shipment.events || [])
    ];

    setShipments(prev => ({
      ...prev,
      [trackingNumber]: { ...prev[trackingNumber], currentStatus: newStatus, events: updatedEvents }
    }));

    if (supabase) {
      await supabase.from('shipments').update({ currentStatus: newStatus, events: updatedEvents }).eq('trackingNumber', trackingNumber);
      sendDiscordNotification(`🛵 **Kurye Güncellemesi:** ${trackingNumber}`, getDiscordStatusEmbed(newStatus, shipment.sender, trackingNumber));
    }
    addNotification(`Kargo durumu güncellendi: ${STATUS_CFG[newStatus].label}`, 'success');
  };

  const renderTabContent = () => {
    if (viewingShipment) {
      return (
        <div>
          <button onClick={() => setViewingShipment(null)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-fg hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Geri Dön
          </button>
          <h3 className="text-xl font-bold mb-6">Kargo Detayları: <span className="text-primary font-mono">{viewingShipment.trackingNumber}</span></h3>
          <div className="bg-card p-6 rounded-xl border border-white/10 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-fg">Gönderen</p><p className="font-semibold">{viewingShipment.sender}</p></div>
              <div><p className="text-xs text-muted-fg">Alıcı</p><p className="font-semibold">{viewingShipment.receiver}</p></div>
              <div><p className="text-xs text-muted-fg">Durum</p>
                <select
                  value={viewingShipment.currentStatus}
                  onChange={(e) => {
                    handleStatusUpdate(viewingShipment.trackingNumber, e.target.value);
                    setViewingShipment(s => ({ ...s, currentStatus: e.target.value }));
                  }}
                  className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm">
                  {STEP_ORDER.map(key => <option key={key} value={key}>{STATUS_CFG[key].label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'all_shipments':
        return (
          <div className="space-y-4">
            {Object.values(shipments).map(ship => (
              <div key={ship.trackingNumber} className="bg-card rounded-lg p-4 flex items-center justify-between border border-white/[0.08]">
                <div>
                  <p className="font-mono text-primary text-sm">{ship.trackingNumber}</p>
                  <p className="font-semibold text-sm">{ship.origin} → {ship.destination}</p>
                </div>
                <button onClick={() => setViewingShipment(ship)} className="text-sm px-4 py-2 rounded-md bg-accent text-white font-medium">Detaylar</button>
              </div>
            ))}
          </div>
        );
      case 'create_shipment':
        return <CreateShipmentForm onCreateShipment={handleCreatePublicShipment} addNotification={addNotification} />;
      case 'requests':
        return (
          <div className="space-y-4">
            {Object.values(courierCalls).map(call => (
              <div key={call.id} className="bg-card p-4 rounded-lg border border-white/10 flex justify-between items-center">
                <div><p className="font-bold">{call.name} {call.surname}</p><p className="text-sm text-muted-fg">{call.address}</p></div>
                <span className={`px-2 py-1 text-xs rounded-full ${call.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{call.status}</span>
              </div>
            ))}
          </div>
        );
      case 'invoices':
        return <InvoiceDocument shipments={shipments} addNotification={addNotification} />;
      case 'proof':
        return <ProofOfDelivery shipments={shipments} setShipments={setShipments} couriers={couriers} addNotification={addNotification} />;
      case 'mailbox':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg text-primary">İç Yazışmalar</h4>
              <button onClick={() => { setEmployeeMailContentState('compose'); setSelectedEmployeeMail(null); }} className="text-xs px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90 transition-all">Yeni Mail</button>
            </div>
            {employeeMailContentState === 'compose' ? (
              <ComposeMail couriers={couriers} sendInternalMail={sendInternalMail} uploadMailImage={uploadMailImage} addNotification={addNotification} onCancel={() => setEmployeeMailContentState('list')} initialData={selectedEmployeeMail ? { receiverId: selectedEmployeeMail.sender_id, subject: `Yanıt: ${selectedEmployeeMail.subject}`, body: `\n\n--- Orijinal Mesaj ---\n${selectedEmployeeMail.body}`, parentMailId: selectedEmployeeMail.id } : null} />
            ) : employeeMailContentState === 'view' && selectedEmployeeMail ? (
              <ViewMail mail={selectedEmployeeMail} sender={couriers[selectedEmployeeMail.sender_id]} receiver={couriers[selectedEmployeeMail.receiver_id]} onBack={() => { setEmployeeMailContentState('list'); setSelectedEmployeeMail(null); }} onReply={(mailToReply) => { setEmployeeMailContentState('compose'); setSelectedEmployeeMail(mailToReply); }} onForward={(mailToForward) => { setEmployeeMailContentState('compose'); setSelectedEmployeeMail(mailToForward); }} />
            ) : (
              <div className="space-y-2">
                {Object.values(internalMails).filter(m => m.receiver_id === courier.id || m.sender_id === courier.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(mail => (
                  <div key={mail.id} onClick={() => { setSelectedEmployeeMail(mail); setEmployeeMailContentState('view'); }} className="bg-card p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${mail.read_at ? 'bg-transparent' : 'bg-primary shadow-[0_0_8px_rgba(237,58,50,0.5)]'}`}></div>
                      <p className="font-medium">{mail.subject}</p>
                    </div>
                    <p className="text-[10px] text-muted-fg font-mono uppercase">{new Date(mail.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'archive':
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-primary">Tamamlanan Görevlerim</h4>
            <div className="mb-4 bg-card p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-fg block mb-1 font-bold uppercase">Tarih Filtresi</label>
                <input type="date" value={archiveSearchDate} onChange={e => setArchiveSearchDate(e.target.value)} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={() => setArchiveSearchDate('')} className="h-10 px-4 rounded-xl bg-secondary text-muted-fg text-xs font-semibold hover:text-foreground">Sıfırla</button>
            </div>
            {Object.values(shipments)
              .filter(s => s.courierId === courier.id && ['delivered', 'failed'].includes(s.currentStatus))
              .filter(s => !archiveSearchDate || (s.created_at && s.created_at.startsWith(archiveSearchDate)))
              .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
              .map(ship => (
                <div key={ship.trackingNumber} className="bg-card rounded-lg p-4 flex items-center justify-between border border-white/[0.08]">
                  <div>
                    <p className="font-mono text-primary text-sm font-bold">{ship.trackingNumber}</p>
                    <p className="font-semibold text-sm">{ship.origin} → {ship.destination}</p>
                    <p className="text-[10px] text-muted-fg mt-1">Tarih: {new Date(ship.created_at || Date.now()).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] rounded-full uppercase font-bold ${ship.currentStatus === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{STATUS_CFG[ship.currentStatus].label}</span>
                </div>
              ))}
            {Object.values(shipments).filter(s => s.courierId === courier.id && ['delivered', 'failed'].includes(s.currentStatus)).length === 0 && <p className="text-center py-10 text-muted-fg italic">Henüz tamamlanmış görev bulunmuyor.</p>}
          </div>
        );
      default: // my_shipments
        return (
          <div className="space-y-4">
            {myShipments.length > 0 ? myShipments.map(ship => (
              <div key={ship.trackingNumber} className="bg-card rounded-lg p-4 flex items-center justify-between border border-white/[0.08]">
                <div>
                  <p className="font-mono text-primary text-sm">{ship.trackingNumber}</p>
                  <p className="font-semibold text-sm">{ship.origin} → {ship.destination}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select value={ship.currentStatus} onChange={(e) => handleStatusUpdate(ship.trackingNumber, e.target.value)} className="bg-secondary border border-white/[0.08] rounded-md px-3 py-1.5 text-sm">
                    {STEP_ORDER.map(key => (<option key={key} value={key}>{STATUS_CFG[key].label}</option>))}
                  </select>
                  <button onClick={() => setViewingShipment(ship)} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white">Detaylar</button>
                </div>
              </div>
            )) : <p className="text-muted-fg italic text-center py-10">Üzerine atanmış aktif görev bulunmuyor.</p>}
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <aside className="md:col-span-1">
        <div className="bg-card/50 p-4 rounded-xl border border-white/10 mb-6">
          <p className="text-xs text-muted-fg uppercase font-bold mb-1">Oturum Açan</p>
          <p className="font-bold text-foreground">{courier.name}</p>
          <p className="text-[10px] text-muted-fg">GTAW ID: {courier.gtaw_id || 'N/A'}</p>
          <p className="text-xs text-primary font-semibold">{RANK_LABELS[rank]}</p>
        </div>
        <nav className="flex flex-col space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setViewingShipment(null); }} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-muted-fg hover:bg-white/5 hover:text-foreground'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="md:col-span-3">
        {renderTabContent()}
      </div>
    </div>
  );
}

// Müşteri Paneli Bileşeni (Normal Giriş Yapanlar İçin)
const CustomerPanel = ({ shipments, user, internalMails, sendInternalMail, addNotification, clearMailsCount, setViewingShipment, setCurrentView }) => {
  const [activeTab, setActiveTab] = useState('shipments');
  const [mailContentState, setMailContentState] = useState('list');
  const [selectedMail, setSelectedMail] = useState(null);

  useEffect(() => {
    if (activeTab === 'mailbox') clearMailsCount();
  }, [activeTab, clearMailsCount]);

  // Sadece bu kullanıcıya ait kargoları filtrele (Email/Discord alanı üzerinden eşleştirme)
  const myShipments = Object.values(shipments).filter(s => {
    const identifiers = [user.username, `@${user.username}`, user.name].filter(Boolean);
    return (s.user_id && String(s.user_id) === String(user.id)) || 
           identifiers.some(id => s.email === id || s.sender === id || s.receiver === id) || 
           (user.subscriberCompany && s.sender === user.subscriberCompany);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-8">
      <aside className="md:col-span-1">
        <div className="bg-card/50 p-4 rounded-xl border border-white/10 mb-6">
          <p className="text-xs text-muted-fg uppercase font-bold mb-1">Müşteri Hesabı</p>
          <p className="font-bold text-foreground">{user.name || user.username}</p>
          <p className="text-[10px] text-muted-fg mt-1">GTAW ID: {user.id || 'Bilinmiyor'}</p>
        </div>
        <nav className="flex flex-col space-y-1">
          <button onClick={() => {setActiveTab('shipments'); setViewingShipment(null);}} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'shipments' ? 'bg-primary/10 text-primary' : 'text-muted-fg hover:bg-white/5 hover:text-foreground'}`}>
            📦 Kargolarım
          </button>
          <button onClick={() => {setActiveTab('mailbox'); setViewingShipment(null);}} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'mailbox' ? 'bg-primary/10 text-primary' : 'text-muted-fg hover:bg-white/5 hover:text-foreground'}`}>
            ✉️ Destek Mesajlarım
          </button>
        </nav>
      </aside>
      
      <div className="md:col-span-3">
        {activeTab === 'shipments' ? (
          <div>
            <h3 className="text-xl font-bold mb-6">Adıma Kayıtlı Kargolar</h3>
            <div className="space-y-4">
              {myShipments.length > 0 ? myShipments.map(ship => (
                <div key={ship.trackingNumber} className="bg-card rounded-lg p-4 flex items-center justify-between border border-white/[0.08]">
                  <div>
                    <p className="font-mono text-primary text-sm font-bold">{ship.trackingNumber}</p>
                    <p className="font-semibold text-sm">{ship.origin} → {ship.destination}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_CFG[ship.currentStatus]?.color} ${STATUS_CFG[ship.currentStatus]?.bg} ${STATUS_CFG[ship.currentStatus]?.border}`}>{STATUS_CFG[ship.currentStatus]?.label}</span>
                  </div>
                  <button onClick={() => setCurrentView({ type: 'searchResult', data: ship })} className="text-sm px-4 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90 transition-all">Detaylar</button>
                </div>
              )) : <p className="text-muted-fg italic py-10 text-center">Henüz adınıza kayıtlı kargo bulunmuyor.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h4 className="font-bold text-lg text-primary">Destek Taleplerim</h4><button onClick={() => { setMailContentState('compose'); setSelectedMail(null); }} className="text-xs px-3 py-1.5 rounded-md bg-accent text-white font-medium">Yeni Talep</button></div>
            {mailContentState === 'compose' ? (
               <ComposeMail couriers={{ 'admin': { id: 'admin', name: 'GoPostal Destek Panel', rank: 'admin' } }} sendInternalMail={sendInternalMail} uploadMailImage={() => null} addNotification={addNotification} onCancel={() => setMailContentState('list')} initialData={null} />
            ) : mailContentState === 'view' && selectedMail ? (
               <ViewMail mail={selectedMail} sender={selectedMail.sender_id === 'admin' ? { name: 'GoPostal Destek' } : { name: user.username }} receiver={{ name: 'GoPostal Destek' }} onBack={() => setMailContentState('list')} onReply={(m) => { setMailContentState('compose'); setSelectedMail(m); }} onForward={() => {}} />
            ) : (
              <div className="space-y-2">
                {Object.values(internalMails).filter(m => m.receiver_id === user.id || m.sender_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(mail => (
                  <div key={mail.id} onClick={() => { setSelectedMail(mail); setMailContentState('view'); }} className="bg-card p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer flex justify-between items-center">
                    <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${mail.read_at ? 'bg-transparent' : 'bg-primary'}`}></div><p className="font-medium">{mail.subject}</p></div>
                    <p className="text-[10px] text-muted-fg font-mono uppercase">{new Date(mail.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Fiyat Hesaplama Bileşeni
const PriceCalculator = ({ addNotification }) => {
  const [weight, setWeight] = useState('');
  const [distance, setDistance] = useState('city');
  const [price, setPrice] = useState(null);
  const handleCalc = (e) => { e.preventDefault(); const w = parseFloat(weight); setPrice((distance === 'city' ? 50 + w * 15 : 150 + w * 45).toFixed(2)); };
  return (
    <div className="bg-card p-8 rounded-2xl max-w-md mx-auto border border-white/10">
      <h2 className="text-2xl font-bold mb-6 text-center">Fiyat Hesapla</h2>
      <form onSubmit={handleCalc} className="space-y-4">
        <input type="number" placeholder="Ağırlık (kg)" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-secondary p-3 rounded-lg" required />
        <select value={distance} onChange={e => setDistance(e.target.value)} className="w-full bg-secondary p-3 rounded-lg"><option value="city">Şehir İçi</option><option value="intercity">Şehirler Arası</option></select>
        <button type="submit" className="w-full bg-primary p-3 rounded-lg font-bold">Hesapla</button>
      </form>
      {price && <div className="mt-4 text-center text-2xl font-bold text-primary">${price}</div>}
    </div>
  );
};

export default function Home() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState({ type: 'default' });
  const [unreadMailsCount, setUnreadMailsCount] = useState(0);
  const [session, setSession] = useState(null); // Oturum bilgisi artık kalıcı

  // Realtime listener'ların güncel session'ı görmesi için Ref
  const sessionRef = useRef(session);
  const [shipments, setShipments] = useState(DATA);
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [couriers, setCouriers] = useState(INITIAL_COURIERS);
  const couriersRef = useRef(couriers); // Realtime listener'ların güncel kurye listesini görmesi için
  const [subscribers, setSubscribers] = useState(INITIAL_SUBSCRIBERS);
  const [courierCalls, setCourierCalls] = useState(INITIAL_COURIER_CALLS);
  const [contactMessages, setContactMessages] = useState(INITIAL_CONTACT_MESSAGES);
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [partners, setPartners] = useState(INITIAL_PARTNERS);
  const [siteConfig, setSiteConfig] = useState(INITIAL_SITE_CONFIG);
  const [internalMails, setInternalMails] = useState({});
  const [activeSearchTab, setActiveSearchTab] = useState('track');
  const [isGopoChatOpen, setIsGopoChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [viewingShipment, setViewingShipment] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [showCharSelect, setShowCharSelect] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    couriersRef.current = couriers;
  }, [couriers]);

  // Oturum kurulumunu ve yetki kontrollerini yöneten yardımcı fonksiyon
  const setupSession = useCallback(async (userData, providedCourierMap = null) => {
    if (!userData) return;
    const role = userData.role || 'customer';

    // Kullanıcı bilgilerini Supabase 'app_users' tablosuna kaydet/güncelle
    if (supabase && userData.id) {
      try {
        await supabase.from('app_users').upsert({
          id: userData.id,
          username: userData.username,
          name: userData.name || userData.username,
          role: role,
          last_login: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (e) {
        console.error("app_users tablosuna yazilirken hata olustu:", e);
      }
    }

    if (role === 'admin') {
      setSession({ type: 'admin', user: userData });
      setCurrentView({ type: 'admin' });
    } else if (role === 'customer') {
      let userToSet = userData;
      // Abone kontrolü: GTAW ID ile eşleşen bir abonelik var mı?
      if (supabase && userData.id) {
        const { data: subscriberData } = await supabase.from('subscribers')
          .select('companyName')
          .eq('gtaw_id', userData.id)
          .maybeSingle();
        if (subscriberData) userToSet = { ...userToSet, subscriberCompany: subscriberData.companyName };
      }
      setSession({ type: 'customer', user: userToSet });
      setCurrentView({ type: 'customer' });
    } else if (role === 'employee') {
      let courierMap = providedCourierMap;
      
      if (!courierMap) {
        const { data: curs } = await supabase.from('couriers').select('*');
        courierMap = curs ? Object.fromEntries(curs.map(c => [c.id, c])) : {};
        if (curs) setCouriers(courierMap);
      }

      // Önce courierId ile, yoksa karakter ismiyle eşleştir
      let courier = userData.courierId ? courierMap[userData.courierId] : null;
      
      if (!courier && userData.name) {
        courier = Object.values(courierMap).find(
          c => c.name.toLowerCase() === userData.name.toLowerCase()
        );
      }

      if (courier) {
        setSession({ type: 'employee', user: courier });
        setCurrentView({ type: 'employee' });
      } else {
        // Rol 'employee' ama kurye kaydı bulunamadıysa müşteri gibi davran
        setSession({ type: 'customer', user: userData });
        setCurrentView({ type: 'customer' });
      }
    }

    // Okunmamış mesaj sayısını güncelle
    const myId = role === 'admin' ? 'admin' : (userData.courierId || userData.id);
    if (myId && supabase) {
      const { count } = await supabase.from('internal_mails').select('*', { count: 'exact', head: true })
        .or(`receiver_id.eq.${myId},receiver_id.eq.all`).is('read_at', null);
      setUnreadMailsCount(count || 0);
    }
  }, [supabase]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      try {
        // Önce kuryeleri çek
        const { data: curs } = await supabase.from('couriers').select('*');
        const courierMap = curs ? Object.fromEntries(curs.map(c => [c.id, c])) : {};
        if (curs) {
            setCouriers(courierMap);
            couriersRef.current = courierMap;
        }

        // Oturum, GTA World OAuth çerezi üzerinden sunucudan (me.php) alınır.
        try {
          const res = await fetch('/auth/me.php', { credentials: 'same-origin' });
          if (res.ok) {
            const data = await res.json();
            if (data?.authenticated && data.user) {
              // UCP'de karakter varsa her seferinde seçtir (Zorunlu karakter secimi)
              if (data.user.characters && data.user.characters.length > 0) {
                setPendingUser(data.user);
                setShowCharSelect(true);
              } else {
                await setupSession(data.user, courierMap);
              }
            }
          }
        } catch (e) { /* oturum yok veya endpoint erişilemez */ }

        const { data: ships } = await supabase.from('shipments').select('*');
        if (ships) setShipments(Object.fromEntries(ships.map(s => [s.trackingNumber, s])));
        if (curs) setCouriers(Object.fromEntries(curs.map(c => [c.id, c])));

        const { data: msgs } = await supabase.from('contact_messages').select('*');
        if (msgs) setContactMessages(Object.fromEntries(msgs.map(m => [m.id, m])));

        const { data: calls } = await supabase.from('courier_calls').select('*');
        if (calls) setCourierCalls(Object.fromEntries(calls.map(c => [c.id, c])));

        const { data: subs } = await supabase.from('subscribers').select('*');
        if (subs) setSubscribers(Object.fromEntries(subs.map(s => [s.id, s])));

        const { data: brs } = await supabase.from('branches').select('*');
        if (brs) setBranches(Object.fromEntries(brs.map(b => [b.id, b])));

        const { data: prts } = await supabase.from('partners').select('*');
        if (prts) setPartners(Object.fromEntries(prts.map(p => [p.id, p])));

        const { data: pgData } = await supabase.from('pages').select('*');
        if (pgData) {
          setPages(prev => {
            const newPages = JSON.parse(JSON.stringify(prev));
            pgData.forEach(p => {
              if (newPages[p.group_key]) newPages[p.group_key].items[p.slug] = { title: p.title, content: p.content };
            });
            return newPages;
          });
        }

        const { data: settings } = await supabase.from('site_settings').select('*');
        if (settings) {
          const configObj = Object.fromEntries(settings.map(s => [s.key, s.value]));
          if (configObj.headerNav) configObj.headerNav = JSON.parse(configObj.headerNav);
          setSiteConfig(prev => ({ ...prev, ...configObj }));
        }

        const { data: mails } = await supabase.from('internal_mails').select('*').order('created_at', { ascending: false });
        if (mails) setInternalMails(Object.fromEntries(mails.map(m => [m.id, m])));
      } catch (err) {
        console.error("❌ Veri çekme hatası:", err.message);
      }
    };
    fetchData();

    const channel = supabase.channel('db-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setShipments(prev => {
            const { [payload.old.trackingNumber]: _, ...remaining } = prev;
            return remaining;
          });
          return;
        }
        setShipments(prev => ({ ...prev, [payload.new.trackingNumber]: payload.new }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courier_calls' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setCourierCalls(prev => {
            const { [payload.old.id]: _, ...remaining } = prev;
            return remaining;
          });
          return;
        }
        setCourierCalls(prev => ({ ...prev, [payload.new.id]: payload.new }));
        if (payload.eventType === 'INSERT') addNotification('🔔 Yeni bir kurye talebi geldi!', 'warning');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_mails' }, (payload) => {
        setInternalMails(prev => ({ ...prev, [payload.new.id]: payload.new }));
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        const newMail = payload.new;
        const myId = currentSession.type === 'admin' ? 'admin' : currentSession.user?.id;
        const senderName = couriersRef.current[newMail.sender_id]?.name || 'Sistem';
        if (newMail.receiver_id === myId || newMail.receiver_id === 'all') {
          setUnreadMailsCount(prev => prev + 1);
          addNotification(`📧 [${senderName}] Yeni Mesaj: ${newMail.subject}`, 'info');
        }
      })
      .subscribe();

    return () => { if (supabase && channel) supabase.removeChannel(channel); };
  }, []);

  // Karakter seçimi yapıldığında çağrılır
  const handleCharacterSelect = (char) => {
    const updatedUser = { ...pendingUser, name: char.name, selectedCharacter: char };
    setupSession(updatedUser);
    setShowCharSelect(false);
    setPendingUser(null);
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Bildirimleri temizle ve DB'de okundu olarak işaretle
  const clearMailsCount = async () => {
    if (unreadMailsCount === 0) return;
    setUnreadMailsCount(0);
    const myId = session?.type === 'admin' ? 'admin' : session?.user?.id;
    if (supabase && myId) {
      await supabase.from('internal_mails').update({ read_at: new Date().toISOString() }).or(`receiver_id.eq.${myId},receiver_id.eq.all`).is('read_at', null);
    }
  };

  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // Background image rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 10000); // 10 saniyede bir değiştir
    return () => clearInterval(interval);
  }, []);

  // Fallback to ensure loading screen eventually disappears, even if internal timers fail
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsAppLoading(false);
    }, 20000); // Yükleme ekranının yeni animasyon süresine göre ayarlandı (yaklaşık 18.5 saniye)
    return () => clearTimeout(fallbackTimer);
  }, []);
  // Apply background style
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-image', `url(${BACKGROUND_IMAGES[currentBgIndex]})`);
  }, [currentBgIndex]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query || isLoading) return;

    setIsLoading(true);
    setCurrentView({ type: 'default' }); // Yeni arama için görünümü sıfırla

    setTimeout(() => {
      const upperQuery = query.trim().toUpperCase();
      const ship = shipments[upperQuery];
      if (ship) {
        // Eğer müşteri giriş yapmışsa, sadece kendine ait kargoyu takip edebilsin (Güvenlik)
        if (session?.type === 'customer') {
          const isOwner = ship.email === session.user.username || ship.email === `@${session.user.username}` || ship.sender === session.user.username;
          if (!isOwner) {
            addNotification("Bu takip numarası sizin hesabınızla ilişkili değil.", "error");
            setIsLoading(false);
            return;
          }
        }
        setCurrentView({ type: 'searchResult', data: ship });
      } else {
        setCurrentView({ type: 'error', query: upperQuery });
      }
      setIsLoading(false);
    }, 2000);
  };

  const handleDemoClick = (num) => {
    setQuery(num);
    // Formu otomatik göndermek için bir sonraki render döngüsünü bekliyoruz.
    setTimeout(() => {
      document.getElementById('search-form-submit-button')?.click();
    }, 0);
  }

  const handleCallCourier = async (formData) => {
    const callId = `call-${Date.now()}`;
    const newCall = {
      id: callId,
      name: formData.name,
      surname: formData.surname,
      address: formData.address,
      phone: formData.phone,
      email: formData.email, // Add email to courier call
      timestamp: new Date().toISOString(),
      status: 'pending',
      courierId: null,
    };
    setCourierCalls(prev => ({ ...prev, [callId]: newCall }));
    if (supabase) {
      await supabase.from('courier_calls').insert([newCall]);
      // Discord Bildirimi
      sendDiscordNotification(
        `🛵 **Yeni Kurye Talebi Geldi!**`,
        {
          title: "Kurye Çağrı Bilgisi",
          description: `Sayın Yönetici,\n\n**${formData.name} ${formData.surname}** isimli kullanıcı kapısına kurye talep etti.\n\n📍 **Adres:** ${formData.address}`,
          color: 15844367,
          thumbnail: { url: 'https://cppiiabotmdacjrhjcgv.supabase.co/storage/v1/object/public/assets/gopostolmaksot.png' },
          fields: [
            { name: "Discord", value: formData.email ? `@${formData.email}` : "Belirtilmedi", inline: true },
            { name: "Telefon", value: formData.phone, inline: true }
          ],
          footer: { text: "GoPostal Yönetim Paneli" },
          timestamp: new Date().toISOString()
        }
      );
    }
    console.log("Kurye çağırıldı:", formData);
  };


  const handleCreatePublicShipment = async (formData) => {
    const courierIds = Object.keys(couriers);
    // Only assign if couriers exist in the system, otherwise set to null
    const randomCourierId = courierIds.length > 0 ? courierIds[Math.floor(Math.random() * courierIds.length)] : null;

    let newTrackingNumber;
    do {
      newTrackingNumber = `GO-LS-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (shipments[newTrackingNumber]);

    const newEntry = {
      trackingNumber: newTrackingNumber,
      // Eğer kullanıcı giriş yapmışsa, formdaki ismi değil kendi ismini/karakterini kullan (opsiyonel: form boşsa)
      sender: formData.sender || (session?.user?.name || session?.user?.username || 'Anonim'),
      receiver: formData.receiver,
      origin: formData.originAddress,
      destination: formData.destinationAddress,
      // Filtreleme için email alanına kullanıcının karakter ismini veya kullanıcı adını basıyoruz
      user_id: session?.user?.id,
      phone: formData.phone,
      email: formData.email || (session?.user ? (session.user.name || session.user.username) : ''),
      signatureDataUrl: formData.signatureDataUrl,
      weight: formData.weight,
      currentStatus: 'received',
      estimatedDelivery: 'Hesaplanıyor...',
      courierId: randomCourierId,
      created_at: new Date().toISOString(),
      events: [{
        timestamp: getFormattedTimestamp(),
        location: formData.originAddress,
        description: 'Gönderi bilgileri alındı',
        status: 'received'
      }]
    };

    setShipments(prev => ({ ...prev, [newTrackingNumber]: newEntry }));

    if (supabase) {
      // Remove courierId from payload if it's null and your DB requires a valid ID
      // or ensure the DB column allows NULL.
      const dbPayload = { ...newEntry };

      if (!dbPayload.courierId) {
        delete dbPayload.courierId;
        // Not: Eğer shipments.courierId Postgres'te NOT NULL ise, 
        // you must add a courier to the DB first.
      }

      const { data, error } = await supabase.from('shipments').insert([dbPayload]).select();
      if (error) {
        console.error("Kargo kayıt hatası:", error);
        addNotification(`Kargo kaydedilemedi (Veritabanı Hatası): ${error.message}`, 'error');
        return;
      }
      if (data?.[0]) {
        const fullEntry = { ...newEntry, ...data[0] };

        // Discord Bildirimi
        sendDiscordNotification(
          `🚀 **Yeni Kargo Verildi!**`,
          getDiscordStatusEmbed('received', formData.sender, newTrackingNumber, formData.email)
        );

        setShipments(prev => ({ ...prev, [newTrackingNumber]: fullEntry }));
        addNotification(`Gönderiniz başarıyla oluşturuldu! Takip numaranız: ${newTrackingNumber}`, 'success');
        setCurrentView({ type: 'searchResult', data: fullEntry });
        return;
      } else {
        // Veritabanı gecikmesi durumunda fallback (RLS kaynaklı olabilir)
        sendDiscordNotification(
          `🚀 **Yeni Kargo Verildi!** (Veritabanı Onayı Bekleniyor)`,
          getDiscordStatusEmbed('received', formData.sender, newTrackingNumber, formData.email)
        );
        addNotification(`Gönderiniz başarıyla oluşturuldu! Takip numaranız: ${newTrackingNumber}`, 'success');
        setCurrentView({ type: 'searchResult', data: newEntry });
        return;
      }
    }

    // Supabase yoksa (Demo)
    const demoEntry = { ...newEntry, id: 'local-' + Date.now() };
    setShipments(prev => ({ ...prev, [newTrackingNumber]: demoEntry }));

    // Demo kargo oluşturulduğunda da Discord bildirimi gönder
    sendDiscordNotification(
      `🚀 **Yeni Kargo Verildi!** (Demo)`,
      getDiscordStatusEmbed('received', formData.sender, newTrackingNumber, formData.email)
    );

    addNotification(`Gönderiniz oluşturuldu (Lokal Mod)! Takip: ${newTrackingNumber}`, 'success');
    setCurrentView({ type: 'searchResult', data: demoEntry });
  };

  const handleNewSubscription = async (formData) => {
    const newId = `SUB-${Date.now()}`;
    const newSubscriber = {
      id: newId,
      ...formData,
      status: 'pending', // 'pending', 'active', 'cancelled'
      createdAt: new Date().toISOString()
    };
    setSubscribers(prev => ({ ...prev, [newId]: newSubscriber }));
    if (supabase) {
      await supabase.from('subscribers').insert([newSubscriber]);
    }
    addNotification('Abonelik başvurunuz başarıyla alınmıştır.', 'success');
    setCurrentView({ type: 'default' });
  };

  const handleNewContactMessage = async (formData) => {
    const msgId = `msg-${Date.now()}`;
    setContactMessages(prev => ({
      ...prev,
      [msgId]: { id: msgId, ...formData, createdAt: new Date().toISOString(), status: 'new' }
    }));

    if (supabase) {
      await supabase.from('contact_messages').insert([{ ...formData, status: 'new' }]);
    }
  };

  // GTA World OAuth akışını başlatır (sunucudaki start.php authorize'a yönlendirir).
  const loginWithGtaWorld = () => {
    window.location.href = '/auth/start.php';
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout.php', { credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } });
    } catch (e) { /* yine de istemci tarafını temizle */ }
    setSession(null);
    setUnreadMailsCount(0);
    setCurrentView({ type: 'default' });
  };

  const handleGoHome = () => {
    // Yalnızca panel sahibi roller kendi paneline döner; müşteri/ziyaretçi ana sayfaya.
    if (session && (session.type === 'admin' || session.type === 'employee')) {
      setCurrentView({ type: session.type });
    } else {
      setCurrentView({ type: 'default' });
    }
  }

  const sendInternalMail = async (mailData) => {
    if (supabase) {
      let recipients = [mailData.receiverId];

      // Toplu mail senaryosu
      if (mailData.receiverId === 'all') {
        recipients = Object.keys(couriers);
      }

      const mailRecords = recipients.map(recId => ({
        subject: mailData.subject,
        body: mailData.body,
        receiver_id: recId,
        image_url: mailData.imageUrl,
        parent_mail_id: mailData.parentMailId,
        forwarded_from_id: mailData.forwardedFromId,
        sender_id: session?.user?.id || 'admin',
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase.from('internal_mails').insert(mailRecords).select();

      if (error) {
        console.error("Supabase Mail Gönderme Hatası:", error);
        addNotification(`Mail gönderilemedi: ${error.message}`, 'error');
        return false;
      }

      if (data) {
        const newMailsObj = Object.fromEntries(data.map(m => [m.id, m]));
        setInternalMails(prev => ({ ...prev, ...newMailsObj }));
      }
    }

    addNotification(mailData.receiverId === 'all' ? 'Toplu mail başarıyla gönderildi.' : 'Mail başarıyla gönderildi.', 'success');
    return true;
  };

  const uploadMailImage = async (file) => {
    return null; // Gelecekte Storage bucket entegrasyonu için ayrıldı
  };

  const handleShowPage = (slug) => {
    if (slug === 'kargo-takip') {
      handleGoHome();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (slug === 'gonderim-olustur') {
      // Eğer giriş yapılmışsa ve karakter seçilmemişse önce karakter seçtir (özellikle mobilde/telefonda)
      if (session?.user && !session.user.name && session.user.characters?.length > 0) {
        setPendingUser(session.user);
        setShowCharSelect(true);
        return;
      }
      setCurrentView({ type: 'createShipment' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (slug === 'abone-ol') {
      setCurrentView({ type: 'subscribe' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Sayfa verisini iç içe yapıdan bul
    for (const group of Object.values(pages)) {
      if (group.items[slug]) {
        setCurrentView({ type: 'page', data: group.items[slug], slug: slug });
        // Sayfa içeriğinin görüneceği alana yumuşak bir geçiş yap
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
  };

  const renderMainContent = () => {
    switch (currentView.type) {
      case 'admin':
        return <div className="py-8"><AdminPanel shipments={shipments} setShipments={setShipments} pages={pages} setPages={setPages} couriers={couriers} setCouriers={setCouriers} siteConfig={siteConfig} setSiteConfig={setSiteConfig} subscribers={subscribers} setSubscribers={setSubscribers} branches={branches} setBranches={setBranches} contactMessages={contactMessages} setContactMessages={setContactMessages} courierCalls={courierCalls} setCourierCalls={setCourierCalls} partners={partners} setPartners={setPartners} internalMails={internalMails} sendInternalMail={sendInternalMail} uploadMailImage={uploadMailImage} addNotification={addNotification} clearMailsCount={clearMailsCount} /></div>;
      case 'employee':
        return <div className="py-8"><EmployeePanel shipments={shipments} setShipments={setShipments} courier={session?.user} couriers={couriers} courierCalls={courierCalls} setCourierCalls={setCourierCalls} handleCreatePublicShipment={handleCreatePublicShipment} internalMails={internalMails} sendInternalMail={sendInternalMail} uploadMailImage={uploadMailImage} addNotification={addNotification} clearMailsCount={clearMailsCount} /></div>;
      case 'customer':
        return <CustomerPanel shipments={shipments} user={session.user} internalMails={internalMails} sendInternalMail={sendInternalMail} addNotification={addNotification} clearMailsCount={clearMailsCount} setViewingShipment={setViewingShipment} setCurrentView={setCurrentView} />;
      case 'createShipment':
        return <div className="py-8"><CreateShipmentForm onCreateShipment={handleCreatePublicShipment} addNotification={addNotification} /></div>;
      case 'subscribe':
        return <div className="py-8"><SubscriptionForm onSubscribe={handleNewSubscription} addNotification={addNotification} /></div>;
      case 'page':
        if (currentView.slug === 'fiyat-hesapla') return <div className="py-8"><PriceCalculator addNotification={addNotification} /></div>;
        if (currentView.slug === 'iletisim') return <div className="py-8"><ContactForm onSubmit={handleNewContactMessage} addNotification={addNotification} /></div>;
        return (
          <div className="py-8">
            <div className="bg-card p-10 rounded-2xl border border-white/10">
              <h1 className="text-3xl font-bold text-primary mb-6">{currentView.data.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: currentView.data.content || "İçerik yok." }} className="prose prose-invert max-w-none" />
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-4 mb-8">
            <svg width="20" height="20" className="text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <div>
              <p className="font-semibold text-red-400">Kargo Bulunamadı</p>
              <p className="text-sm text-muted-fg mt-1">"<span className="font-mono text-foreground">{currentView.query}</span>" numaralı paket bulunamadı. Lütfen takip numaranızı kontrol edin.</p>
            </div>
          </div>
        );
      case 'searchResult': {
        const shipment = currentView.data;
        const courier = couriers[shipment.courierId];
        const cfg = STATUS_CFG[shipment.currentStatus] || STATUS_CFG.received;
        const titles = { delivered: 'Kargo teslim edildi', out_for_delivery: 'Kargo bugün teslim edilecek' };
        const curIdx = STEP_ORDER.indexOf(shipment.currentStatus);
        return (
          <div className="pb-14">
            <div className="rounded-2xl border border-white/[0.08] bg-card overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-muted-fg">{shipment.trackingNumber}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold">{titles[shipment.currentStatus] || 'Kargonuz yolda'}</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-fg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  Tahmini Teslim: <strong className="text-foreground font-medium ml-1">{shipment.estimatedDelivery}</strong>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-start justify-between relative">
                  <div className="absolute top-4 left-0 right-0 h-px bg-white/[0.08] z-0"></div>
                  {STEPS.map((step, i) => {
                    const isCompleted = i <= curIdx;
                    const isCurrent = i === curIdx;
                    const dotCls = isCurrent ? 'bg-green-500 border-green-500 text-white shadow-[0_0_14px_rgba(34,197,94,0.4)]' : isCompleted ? 'bg-green-500/20 border-green-500/60 text-green-400' : 'bg-card border-white/[0.08] text-muted-fg';
                    const lblCls = isCurrent ? 'text-green-400' : isCompleted ? 'text-foreground' : 'text-muted-fg';
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-2 z-10 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${dotCls}`}>
                          <span className="text-xs font-bold">{isCompleted && !isCurrent ? '✓' : i + 1}</span>
                        </div>
                        <span className={`text-xs font-bold hidden sm:block ${lblCls}`}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1 rounded-xl border border-white/[0.08] bg-card p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>Kurye Bilgileri</h3>
                {courier ? (
                  <div className="flex items-center gap-4">
                    <img src={courier.photo} alt={courier.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/[0.1]" />
                    <div>
                      <p className="font-bold text-foreground">{courier.name}</p>
                      <p className="text-sm text-muted-fg font-mono">{courier.phone}</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-fg">Kurye bilgisi bulunamadı.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="rounded-xl border border-white/[0.08] bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>Kargo Bilgileri</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-start gap-2"><dt className="text-xs text-muted-fg flex-shrink-0">Gönderici</dt><dd className="text-xs font-medium text-right">{shipment.sender}</dd></div>
                    <div className="flex justify-between items-start gap-2"><dt className="text-xs text-muted-fg flex-shrink-0">Alıcı</dt><dd className="text-xs font-medium text-right">{shipment.receiver}</dd></div>
                    <div className="flex justify-between items-start gap-2"><dt className="text-xs text-muted-fg flex-shrink-0">Ağırlık</dt><dd className="text-xs font-medium text-right">{shipment.weight}</dd></div>
                  </dl>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>Güzergah</h3>
                  <div className="relative pl-4">
                    <div className="absolute left-1.5 top-2 bottom-2 w-px bg-white/[0.08]"></div>
                    <div className="relative mb-4"><div className="absolute -left-3 top-1 w-2 h-2 rounded-full bg-primary"></div><p className="text-xs text-muted-fg">Çıkış</p><p className="text-xs font-medium mt-0.5">{shipment.origin}</p></div>
                    <div className="relative"><div className="absolute -left-3 top-1 w-2 h-2 rounded-full border-2 border-primary bg-card"></div><p className="text-xs text-muted-fg">Varış</p><p className="text-xs font-medium mt-0.5">{shipment.destination}</p></div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-card p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-5 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>Kargo Geçmişi</h3>
                <div className="relative pl-4">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-white/[0.08]"></div>
                  {shipment.events.map((ev, i) => {
                    const ecfg = STATUS_CFG[ev.status] || STATUS_CFG.received;
                    return (
                      <div key={i} className="relative mb-5 last:mb-0">
                        <div className={`absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? 'bg-primary border-primary' : 'bg-card border-white/[0.08]'}`}></div>
                        <div className={`rounded-lg p-3.5 transition-colors ${i === 0 ? 'border border-primary/20 bg-primary/5' : 'border border-transparent hover:border-white/[0.08] hover:bg-secondary/50'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                            <span className={`text-xs font-medium ${ecfg.color}`}>{ecfg.label}</span>
                            <span className="font-mono text-xs text-muted-fg">{ev.timestamp}</span>
                          </div>
                          <p className="text-sm font-medium mb-1.5">{ev.description}</p>
                          <p className="text-xs text-muted-fg">📍 {ev.location}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 group transition-all hover:border-primary/30">
                <h3 className="font-semibold mb-1.5">Canlı Takip</h3>
                <p className="text-sm text-muted-fg leading-relaxed">Kargonuzu anlık konumunu ve durumunu gerçek zamanlı takip edin.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 group transition-all hover:border-primary/30">
                <h3 className="font-semibold mb-1.5">Hızlı Sorgulama</h3>
                <p className="text-sm text-muted-fg leading-relaxed">Takip numaranızla saniyeler içinde bilgilere ulaşın.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 group transition-all hover:border-primary/30">
                <h3 className="font-semibold mb-1.5">Teslim Bildirimi</h3>
                <p className="text-sm text-muted-fg leading-relaxed">Paket teslim edildiğinde anlık bildirim alın.</p>
              </div>
            </div>
            <PartnersSection partners={partners} />
          </div>
        );
    }
  };

  return (
    <>
      <div className="fixed top-24 right-6 z-[101] space-y-3">
        {notifications.map(n => (
          <Notification key={n.id} message={n.message} type={n.type} onDismiss={() => removeNotification(n.id)} />
        ))}
      </div>
      {showCharSelect && pendingUser && (
        <CharacterSelectModal 
          characters={pendingUser.characters} 
          onSelect={handleCharacterSelect} 
        />
      )}
      {isGopoChatOpen && <GopoChatModal onClose={() => setIsGopoChatOpen(false)} />}
      <style jsx global>{` 
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-image: var(--bg-image, url('https://i.imgur.com/Rc0TD5q.png'));
          background-size: cover;
          background-position: center;
          opacity: 0.07;
          z-index: -1;
          transition: background-image 1.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes float-heart {
          0% { transform: translateY(0) scale(0.5); opacity: 1; }
          100% { transform: translateY(-100px) scale(1.2); opacity: 0; }
        }
        .group:hover .heart-particle { animation: float-heart 1.2s ease-out forwards; }
        .heart-particle { position: absolute; opacity: 0; font-size: 24px; text-shadow: 0 0 10px rgba(255, 0, 0, 0.7); }
      `}</style>
      {isAppLoading && <LoadingScreen onFinished={() => setIsAppLoading(false)} />}
      {isLoading && <SearchLoadingAnimation />}

      <header className="border-b border-white/[0.08] sticky top-0 z-50 backdrop-blur-md bg-[#0d0f14]/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={handleGoHome} className="flex items-center gap-2.5 cursor-pointer">
            <img src="/gtawtr-go.webp" alt="GoPostal Logo" className="w-12 h-12" />
            <span className="font-bold text-lg tracking-tight">GoPostal<span className="text-primary">.</span></span>
          </button>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="sm:hidden p-2 text-muted-fg hover:text-foreground transition-colors">
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>

          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-fg">
            <button onClick={() => handleShowPage('kargo-takip')} className="px-4 py-2 rounded-md hover:text-foreground hover:bg-white/5 transition-colors">Kargo Takip</button>
            {siteConfig.headerNav.map(link => (
              <button key={link.slug} onClick={() => handleShowPage(link.slug)} className="px-4 py-2 rounded-md hover:text-foreground hover:bg-white/5 transition-colors">{link.title}</button>
            ))}
            {session ? (
              <>
                {currentView.type !== session.type && (
                  <button onClick={() => setCurrentView({ type: session.type })} className="px-4 py-2 rounded-md bg-primary/20 text-primary font-semibold text-sm hover:bg-primary/30 transition-colors">
                    {session.type === 'customer' ? 'Kargolarım' : 'Panelim'}
                  </button>
                )}
                <button onClick={handleLogout} className="px-4 py-2 rounded-md bg-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-colors">
                  Çıkış Yap
                </button>
              </>
            ) : (
              <button onClick={loginWithGtaWorld} className="px-4 py-2 rounded-md bg-accent text-white font-semibold text-sm hover:brightness-90 transition-colors flex items-center gap-2">
                <img src="/gtawtrlogo.png" alt="" className="w-5 h-5 object-contain" />
                GTA World ile Giriş
              </button>
            )}
          </nav>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden bg-[#0d0f14] border-b border-white/[0.08] px-4 py-4 space-y-2 animate-popIn">
            <button onClick={() => { handleShowPage('kargo-takip'); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg bg-white/5 text-sm font-medium">Kargo Takip</button>
            {siteConfig.headerNav.map(link => (
              <button key={link.slug} onClick={() => { handleShowPage(link.slug); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors">{link.title}</button>
            ))}
            <div className="pt-4 flex flex-col gap-2 border-t border-white/[0.08]">
              {session ? (
                <>
                  <p className="text-xs text-muted-fg px-4 mb-2">Oturum: {session.type === 'admin' ? 'Admin' : (session.user?.name || session.user?.username)}</p>
                  {currentView.type !== session.type && <button onClick={() => { setCurrentView({ type: session.type }); setIsMobileMenuOpen(false); }} className="w-full h-11 rounded-lg bg-primary/20 text-primary font-semibold text-sm">{session.type === 'customer' ? 'Kargolarım' : 'Panelim'}</button>}
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full h-11 rounded-lg bg-red-500/20 text-red-400 font-semibold text-sm">Çıkış Yap</button>
                </>
              ) : (
                <button onClick={() => { loginWithGtaWorld(); setIsMobileMenuOpen(false); }} className="w-full h-11 rounded-lg bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <img src="/gtawtrlogo.png" alt="" className="w-5 h-5 object-contain" />
                  GTA World ile Giriş
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {['default', 'searchResult', 'error'].includes(currentView.type) && (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[300px] bg-primary/[0.08] blur-[120px] pointer-events-none rounded-full" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">San Andreas'ın En Hızlı<br /><span className="text-primary">Kargo Servisi</span></h1>
                <div className="bg-card/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-1.5">
                  <div className="flex border-b border-white/[0.08] mb-4">
                    <button onClick={() => setActiveSearchTab('track')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${activeSearchTab === 'track' ? 'bg-primary/10 text-primary' : 'text-muted-fg hover:bg-white/5'}`}>Kargo Takip</button>
                    <button onClick={() => setActiveSearchTab('courier')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${activeSearchTab === 'courier' ? 'bg-primary/10 text-primary' : 'text-muted-fg hover:bg-white/5'}`}>Kurye Çağır</button>
                  </div>
                  <div className="px-4 pb-4">
                    {activeSearchTab === 'track' ? (
                      <>
                        <p className="text-muted-fg text-sm mb-4">Takip numaranızı girerek paketinizin nerede olduğunu öğrenin.</p>
                        <form onSubmit={handleSearch} id="search-form" className="flex gap-2 sm:gap-3">
                          <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg></span>
                            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Takip numaranızı girin..." className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-secondary text-foreground placeholder:text-muted-fg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" />
                          </div>
                          <button type="submit" id="search-form-submit-button" disabled={isLoading} className="h-12 px-6 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"><span>Sorgula</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></button>
                        </form>
                        <p className="text-xs text-muted-fg mt-3">Demo: <button onClick={() => handleDemoClick('GO-LS-001')} className="text-primary hover:underline font-mono text-xs ml-1">GO-LS-001</button>, <button onClick={() => handleDemoClick('GO-PB-002')} className="text-primary hover:underline font-mono text-xs">GO-PB-002</button></p>
                      </>
                    ) : (<CallCourierForm onCallCourier={handleCallCourier} addNotification={addNotification} />)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center items-center gap-6 md:mt-0 mt-8 order-last md:order-none">
                <div className="relative group cursor-pointer">
                  <img src="/gopostolmaksot.png" alt="GoPostal Maskot" className="w-auto h-[450px] object-contain drop-shadow-2xl animate-float" />
                  <div className="absolute inset-0 pointer-events-none">
                    <span className="heart-particle" style={{ bottom: '20%', left: '20%', animationDelay: '0s' }}>❤️</span>
                    <span className="heart-particle" style={{ bottom: '30%', left: '70%', animationDelay: '0.1s' }}>❤️</span>
                    <span className="heart-particle" style={{ bottom: '10%', left: '50%', animationDelay: '0.2s' }}>❤️</span>
                    <span className="heart-particle" style={{ bottom: '40%', left: '30%', animationDelay: '0.3s' }}>❤️</span>
                    <span className="heart-particle" style={{ bottom: '25%', left: '80%', animationDelay: '0.4s' }}>❤️</span>
                  </div>
                </div>
                <button onClick={() => setIsGopoChatOpen(true)} className="bg-accent/80 backdrop-blur-sm border border-white/10 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:bg-accent transition-all duration-300 transform hover:scale-105">Gopo yardımına koşsun!</button>
              </div>
            </div>
          </section>
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">{renderMainContent()}</div>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/gtawtr-go.webp" alt="GoPostal Logo" className="w-8 h-8" />
                <span className="font-bold text-lg tracking-tight">GoPostal<span className="text-primary">.</span></span>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">San Andreas genelinde hızlı, güvenilir ve şeffaf kargo hizmetleri sunuyoruz.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              {Object.entries(pages).map(([groupKey, groupData]) => (
                <div key={groupKey}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3">{groupData.title}</p>
                  <ul className="space-y-2">
                    {Object.entries(groupData.items).map(([slug, item]) => (
                      <li key={slug}><button onClick={() => handleShowPage(slug)} className="text-left text-xs text-muted-fg hover:text-foreground transition-colors">{item.title}</button></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <p className="text-xs text-muted-fg">© 2026 GoPostal. Tüm hakları saklıdır.</p>
              <p className="text-[10px] text-muted-fg/50 uppercase tracking-widest">credits <a href="https://forum-tr.gta.world/index.php?/profile/1162-saint-vor/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-bold">vor</a></p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors">📞 {siteConfig.phone}</a>
              <a href="https://discord.gg/RGkmmYQgsG" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors">Discord</a>
              <a href="#" className="flex items-center gap-1.5 hover:text-foreground transition-colors">🌐 Türkçe</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}