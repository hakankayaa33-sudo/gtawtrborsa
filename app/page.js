'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

const INITIAL_COURIERS = {
  'john-doe': {
    id: 'john-doe',
    name: 'John "Postman" Doe',
    phone: '555-0188-GPOSTAL',
    photo: '/courier-john.webp',
    role: 'Senior Courier',
    startDate: '2022-08-15',
    status: 'active', // 'active', 'on_leave', 'terminated'
    notes: 'Specializes in high-value deliveries to the Vinewood Hills area. Excellent driving record.'
  },
  'jane-smith': {
    id: 'jane-smith',
    name: 'Jane "Wheels" Smith',
    phone: '555-0123-GPOSTAL',
    photo: '/courier-jane.webp', // Bu dosyanın public klasöründe olduğunu varsayıyoruz
    role: 'Express Delivery Specialist',
    startDate: '2023-03-10',
    status: 'active',
    notes: 'Handles most of the downtown Los Santos and Pillbox Hill routes. Known for speed and efficiency.'
  }
};

const DATA = {
  "GO-LS-001": {
    trackingNumber:"GO-LS-001", sender:"Ammunation", receiver:"Lamar Davis", 
    origin:"Pillbox Hill, Los Santos", destination:"Grove Street, Davis", weight:"2.4 kg",
    estimatedDelivery:"26 Mayıs 2026", currentStatus:"out_for_delivery",
    courierId: 'john-doe',
    coordinates: { x: 62.5, y: 38.8 }, // Davis, Los Santos
    events:[
      {timestamp:"25 May 2026, 08:14",location:"LS Central Sorting Facility",description:"Paket dağıtım aracına yüklendi, teslimata çıktı.",status:"out_for_delivery"},
      {timestamp:"24 May 2026, 22:45",location:"LS Central Sorting Facility",description:"Paket aktarma merkezine ulaştı.",status:"transit"},
      {timestamp:"24 May 2026, 11:30",location:"LSIA Cargo Terminal",description:"Paket sevk edildi.",status:"transit"},
      {timestamp:"23 May 2026, 17:22",location:"Pillbox Hill GoPostal Office",description:"Paket işleme alındı.",status:"processing"},
      {timestamp:"23 May 2026, 14:05",location:"Pillbox Hill GoPostal Office",description:"Paket göndericiden teslim alındı.",status:"received"}
    ]
  },
  "GO-PB-002": {
    trackingNumber:"GO-PB-002", sender:"Binco Clothing", receiver:"Trevor Philips",
    origin:"Vespucci Canals, Los Santos", destination:"Sandy Shores, Blaine County", weight:"0.8 kg",
    estimatedDelivery:"24 Mayıs 2026", currentStatus:"delivered",
    courierId: 'jane-smith',
    coordinates: { x: 78.2, y: 45.1 }, // Sandy Shores
    events:[
      {timestamp:"24 May 2026, 14:37",location:"Sandy Shores, Blaine County",description:"Paket alıcıya teslim edildi. İmzalayan: Ron Jakowski",status:"delivered"},
      {timestamp:"24 May 2026, 09:12",location:"Grand Senora Desert Sorting Facility",description:"Dağıtıma çıktı.",status:"out_for_delivery"},
      {timestamp:"23 May 2026, 20:55",location:"Grand Senora Desert Sorting Facility",description:"Paket aktarma merkezine ulaştı.",status:"transit"},
      {timestamp:"22 May 2026, 16:40",location:"LSIA Cargo Terminal",description:"Uçağa yüklendi.",status:"transit"},
      {timestamp:"22 May 2026, 11:18",location:"Vespucci GoPostal Office",description:"Paket göndericiden teslim alındı.",status:"received"}
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
      'sss': { title: 'Sıkça Sorulan Sorular', content: '' },
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

const STATUS_CFG = {
  received:         { label:"Alındı",             color:"text-blue-400",   border:"border-blue-400/30",   bg:"bg-blue-400/10"   },
  processing:       { label:"İşleme Alındı",      color:"text-yellow-400", border:"border-yellow-400/30", bg:"bg-yellow-400/10" },
  transit:          { label:"Aktarım Merkezinde", color:"text-purple-400", border:"border-purple-400/30", bg:"bg-purple-400/10" },
  out_for_delivery: { label:"Dağıtımda",          color:"text-orange-400", border:"border-orange-400/30", bg:"bg-orange-400/10" },
  delivered:        { label:"Teslim Edildi",       color:"text-green-400",  border:"border-green-400/30",  bg:"bg-green-400/10"  },
  failed:           { label:"Teslim Edilemedi",    color:"text-red-400",    border:"border-red-400/30",    bg:"bg-red-400/10"    }
};

const STEPS = [
  {key:"received",label:"Alındı"},
  {key:"processing",label:"İşlemde"},
  {key:"transit",label:"Yolda"},
  {key:"out_for_delivery",label:"Dağıtımda"},
  {key:"delivered",label:"Teslim"}
];
const STEP_ORDER = ["received","processing","transit","out_for_delivery","delivered"];

// Yönetici Giriş Paneli (Modal) Bileşeni
const LoginModal = ({ onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Hatalı kullanıcı adı veya şifre.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border border-white/[0.08] p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center mb-6">Yönetici Girişi</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary text-foreground placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
          <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary text-foreground placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="h-12 w-full rounded-xl bg-accent text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">Giriş Yap</button>
        </form>
      </div>
    </div>
  );
};

// Yükleme Ekranı Bileşeni
const LoadingScreen = ({ onFinished }) => {
  const [isSliding, setIsSliding] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const slideTimer = setTimeout(() => setIsSliding(true), 2000); // 2 saniye yanıp söndükten sonra kaydır
    const fadeTimer = setTimeout(() => setIsFading(true), 3000);   // 1 saniyelik kayma animasyonundan sonra karart
    const finishTimer = setTimeout(onFinished, 3500);              // 0.5 saniyelik kararma sonrası bitir

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div className={`fixed inset-0 bg-background z-[100] transition-opacity duration-500 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className={`absolute transition-all duration-1000 ease-in-out ${isSliding ? 'top-2 left-4 sm:left-6' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}>
        <img 
          src="/gtawtr-go.webp" 
          alt="Yükleniyor..." 
          className={`transition-transform duration-1000 ease-in-out ${isSliding ? 'scale-[0.33]' : 'scale-100 animate-pulse-logo'}`} 
          style={{width: '9rem', height: '9rem'}} // Başlangıç boyutu 144px
        />
      </div>
    </div>
  );
};

// Harita üzerinde konum seçmek için Admin paneli bileşeni
const AdminMap = ({ onMarkerPlace, marker }) => {
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleWheel = (e) => {
    e.preventDefault();
    const newZoom = view.zoom * (e.deltaY > 0 ? 0.9 : 1.1);
    setView(v => ({ ...v, zoom: Math.max(0.5, Math.min(newZoom, 10)) }));
  };

  const handleMouseDown = (e) => {
    isDragging.current = false; // Will be set to true on move
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = (e) => {
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) { // Threshold for click vs drag
      handleMapClick(e);
    }
    isDragging.current = false;
  };

  const handleMouseMove = (e) => {
    if (e.buttons !== 1) return; // Only drag with left mouse button
    
    isDragging.current = true;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setView(v => ({ ...v, x: v.x + dx / v.zoom, y: v.y + dy / v.zoom }));
  };
  
  const handleMouseLeave = () => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

  const handleMapClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
    const centerX = rect.width / 2, centerY = rect.height / 2;
    const clickXFromCenter = clickX - centerX, clickYFromCenter = clickY - centerY;
    const imageXFromCenter = (clickXFromCenter / view.zoom) - view.x;
    const imageYFromCenter = (clickYFromCenter / view.zoom) - view.y;
    const imageX = imageXFromCenter + centerX, imageY = imageYFromCenter + centerY;
    const x_percent = (imageX / rect.width) * 100, y_percent = (imageY / rect.height) * 100;

    if (x_percent >= 0 && x_percent <= 100 && y_percent >= 0 && y_percent <= 100) {
        onMarkerPlace({ x: x_percent, y: y_percent });
    }
  };

  return (
    <div ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
         className="relative w-full h-full bg-card rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border-2 border-dashed border-primary/50">
      <div className="absolute inset-0 flex items-center justify-center text-muted-fg text-sm z-0 pointer-events-none">Haritayı kaydırın, zoom yapın ve konumu seçin.</div>
      <div className="w-full h-full" style={{ transform: `scale(${view.zoom}) translate(${view.x}px, ${view.y}px)`, transformOrigin: 'center center', willChange: 'transform' }}>
        <img src="/GTAV_ATLUS_8192x8192.png" alt="Map" className="absolute top-0 left-0 w-full h-full opacity-60" />
        {marker && (
          <div className="absolute" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
             <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"
                  style={{ transform: `translate(-50%, -50%) scale(${1/view.zoom})` }}>
             </div>
          </div>
        )}
      </div>
      {!marker && !isDragging.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold pointer-events-none">
          Konum seçmek için haritaya tıklayın
        </div>
      )}
    </div>
  );
};

// Kullanıcının gördüğü, kaydırılabilir ve zoom yapılabilir harita
const UserMap = ({ coordinates }) => {
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleWheel = (e) => {
    e.preventDefault();
    const newZoom = view.zoom * (e.deltaY > 0 ? 0.9 : 1.1);
    setView(v => ({ ...v, zoom: Math.max(0.5, Math.min(newZoom, 10)) }));
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    containerRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setView(v => ({ ...v, x: v.x + dx / v.zoom, y: v.y + dy / v.zoom }));
  };

  return (
    <div ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseUp}
         className="relative w-full h-96 bg-card rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-white/[0.08]">
      <div className="absolute inset-0 flex items-center justify-center text-muted-fg text-sm">Haritayı kaydırabilir ve mouse tekerleği ile zoom yapabilirsiniz.</div>
      <div className="w-full h-full" style={{ transform: `scale(${view.zoom}) translate(${view.x}px, ${view.y}px)`, transformOrigin: 'center center' }}>
        <img src="/GTAV_ATLUS_8192x8192.png" alt="Shipment Map" className="absolute top-0 left-0 w-full h-full" />
        <div className="absolute w-5 h-5" style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="absolute inset-0 bg-primary rounded-full animate-ping"></div>
            <div className="relative w-full h-full bg-primary rounded-full border-2 border-white"></div>
        </div>
      </div>
    </div>
  );
};

// Herkesin Kullanabildiği Gönderi Oluşturma Formu
const CreateShipmentForm = ({ onCreateShipment }) => {
    const [formData, setFormData] = useState({
        sender: '',
        receiver: '',
        originAddress: '',
        destinationAddress: '',
        weight: '',
    });
    const [marker, setMarker] = useState(null);
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
        if (!marker) {
            alert('Lütfen haritadan bir teslimat başlangıç noktası seçin.');
            return;
        }
        if (!isSigned) {
            alert('Lütfen gönderici imzasını ekleyin.');
            return;
        }
        const signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
        onCreateShipment({ ...formData, originCoordinates: marker, signatureDataUrl });
    };

  return (
    <div className="pb-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Yeni Gönderi Oluştur</h1>
        <p className="text-muted-fg mb-8">Paketinizi San Andreas'ın herhangi bir yerine göndermek için aşağıdaki formu doldurun.</p>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-card border border-white/[0.08] rounded-2xl p-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Gönderi Detayları</h3>
            <input type="text" name="sender" placeholder="Gönderici Adı" value={formData.sender} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="receiver" placeholder="Alıcı Adı" value={formData.receiver} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="originAddress" placeholder="Teslim Alınacak Adres (örn: Grove Street)" value={formData.originAddress} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="destinationAddress" placeholder="Teslim Edilecek Adres (örn: Vinewood Hills)" value={formData.destinationAddress} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="weight" placeholder="Ağırlık (örn: 1.5 kg)" value={formData.weight} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <div className="pt-4">
                <h3 className="text-lg font-semibold">Gönderici İmzası</h3>
                <p className="text-xs text-muted-fg mb-2">Lütfen aşağıdaki alana imzanızı atın.</p>
                <div className="bg-secondary border border-white/[0.08] rounded-xl p-1">
                    <canvas ref={signatureCanvasRef} width="400" height="150" className="w-full h-auto rounded-lg cursor-crosshair bg-background"></canvas>
                </div>
                <button type="button" onClick={clearSignature} className="text-sm text-red-400 hover:underline mt-2">İmzayı Temizle</button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Teslim Alınacak Konum</h3>
            <p className="text-xs text-muted-fg mb-2">Paketin alınacağı konumu haritadan seçin.</p>
            <div className="h-[28rem] mb-4">
              <AdminMap onMarkerPlace={setMarker} marker={marker} />
            </div>
            <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">Gönderi Oluştur ve Takip Numarası Al</button>
          </div>
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

    const handleDownload = (targetRef, fileName) => {
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
        <>
            <style jsx global>{`
                .declaration-page { display: flex; flex-wrap: wrap; gap: 40px; justify-content: center; align-items: flex-start; }
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
                .btn-paper { background-color: #444; margin-top: 10px; }
                .btn-paper:hover { background-color: #222; }
                .phone-mockup { position: relative; width: 330px; height: 720px; background: #111; border-radius: 45px; padding: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 3px solid #222; user-select: none; flex-shrink: 0; }
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
                .signature-canvas { border: 2px dashed #2A3F9D; border-radius: 8px; cursor: crosshair; background-color: #fafafa; width: 100%; max-width: 250px; height: 70px; display: block; margin: 0 auto; touch-action: none; }
                .paper-mockup { width: 420px; min-height: 594px; height: auto; background: #ffffff; border: 1px solid #ccc; box-shadow: 2px 2px 8px rgba(0,0,0,0.1), inset 0 0 50px rgba(0,0,0,0.02); padding: 35px 40px; font-family: 'Times New Roman', Times, serif; color: #111; position: relative; flex-shrink: 0; display: flex; flex-direction: column; }
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
        </>
    );
};

// Fatura / Makbuz Oluşturucu
const InvoiceDocument = () => {
    const [logo, setLogo] = useState(null);
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
        const element = printableAreaRef.current;
        if (!element) return;

        element.classList.add('exporting');
        setTimeout(() => {
            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'invoice.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                element.classList.remove('exporting');
            });
        }, 100);
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
                    </div>
                    <div className="flex gap-2">
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
const ProofOfDelivery = ({ shipments, setShipments, couriers }) => {
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
            setPlate('34 ABC 123'); // Placeholder
            setDeliverer(courier ? courier.name : 'N/A');
            setTracking(selectedShipment.trackingNumber);
            setDatetime(new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' }));
            setLocation(`LAT: ${selectedShipment.coordinates.y.toFixed(4)}, LNG: ${selectedShipment.coordinates.x.toFixed(4)}`);
        }
    }, [selectedShipment, couriers]);

    const handleLogoUpload = (e) => { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = (event) => setLogo(event.target.result); reader.readAsDataURL(e.target.files[0]); } };
    const handlePhotoUpload = (e) => { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = (event) => setDeliveryPhoto(event.target.result); reader.readAsDataURL(e.target.files[0]); } };

    const downloadPNG = () => {
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

    const handleApproveAndArchive = () => {
        if (!selectedShipment) return;
        
        setShipments(prev => {
            const newShipments = { ...prev };
            const shipment = newShipments[selectedShipment.trackingNumber];
            shipment.currentStatus = 'delivered';
            shipment.events.unshift({
                timestamp: getFormattedTimestamp(),
                location: shipment.destination,
                description: 'Paket teslim edildi. Teslimat kanıtı oluşturuldu.',
                status: 'delivered'
            });
            return newShipments;
        });

        alert(`${selectedShipment.trackingNumber} numaralı kargo 'Teslim Edildi' olarak işaretlendi ve arşivlendi.`);
        setSelectedShipment(null);
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
                            <div className="upload-btn-wrapper"><button className="w-full border-2 dashed border-accent text-accent bg-transparent p-2 rounded-lg font-bold cursor-pointer transition-all hover:bg-accent/10">Logo Yükle<input type="file" accept="image/*" onChange={handleLogoUpload} /></button></div>
                            <div className="upload-btn-wrapper"><button className="w-full border-2 dashed border-green-500 text-green-500 bg-transparent p-2 rounded-lg font-bold cursor-pointer transition-all hover:bg-green-500/10">Teslimat Fotoğrafı Yükle<input type="file" accept="image/*" onChange={handlePhotoUpload} /></button></div>
                        </div>
                        {/* Preview Area */}
                        <div ref={captureAreaRef} className="relative w-[750px] h-[380px] bg-black rounded-[45px] p-3 border-2 border-gray-800 shadow-lg mx-auto select-none flex">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[30px] h-[160px] bg-black rounded-r-[20px] z-20"></div>
                            <div className="bg-black w-full h-full rounded-[35px] overflow-hidden relative flex flex-col">
                                <div className="bg-white/95 h-[55px] flex items-center justify-between px-[30px] pl-[50px] border-b-2 border-blue-800 z-10">
                                    {logo && <img src={logo} className="max-w-[120px] max-h-10 object-contain" />}
                                    <div className="text-base font-black text-blue-800 uppercase tracking-widest">Teslimat Kanıtı</div>
                                </div>
                                <div className="flex-1 relative flex justify-center items-center bg-gray-800 overflow-hidden">
                                    <img src={deliveryPhoto} className="absolute w-full h-full object-cover z-0 filter contrast-110 brightness-95" />
                                    {logo && <img src={logo} className="absolute w-1/2 max-w-[300px] opacity-15 z-[1] pointer-events-none mix-blend-overlay" />}
                                    <div className="absolute bottom-4 left-5 z-[4] text-white/80 font-mono text-[13px] [text-shadow:1px_1px_3px_rgba(0,0,0,0.9)] pointer-events-none">
                                        <div>TRACK: {tracking}</div>
                                        <div>{datetime}</div>
                                        <div>{location}</div>
                                    </div>
                                    <div className="absolute bottom-4 right-5 z-[4] text-white font-mono text-[13px] text-right [text-shadow:1px_1px_3px_rgba(0,0,0,0.9)] bg-black/40 p-2 rounded border border-white/20 pointer-events-none">
                                        <div>PLAKA: {plate}</div>
                                        <div>PERSONEL: {deliverer}</div>
                                    </div>
                                    <div className="absolute right-6 z-[5] flex flex-col items-center justify-center bg-black/70 p-4 rounded-2xl border-2 border-green-600/40 backdrop-blur-sm shadow-2xl animate-popIn">
                                        <div className="text-green-500 text-5xl leading-none mb-1 [text-shadow:0_0_15px_rgba(76,175,80,0.8)]">✓</div>
                                        <div className="text-white text-xl font-black tracking-widest uppercase text-center leading-tight">Teslim<br/>Edildi!</div>
                                    </div>
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
const SubscriptionForm = ({ onSubscribe }) => {
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
        if (!isSigned) { alert('Lütfen sözleşmeyi imzalayın.'); return; }
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

// Gelişmiş Admin Paneli Bileşeni
const getFormattedTimestamp = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const AdminPanel = ({ shipments, setShipments, pages, setPages, couriers, setCouriers, siteConfig, setSiteConfig, subscribers, setSubscribers }) => {
  const [activeTab, setActiveTab] = useState('manage');
  const [newShipment, setNewShipment] = useState({ trackingNumber: '', sender: '', receiver: '', origin: '', destination: '', weight: '', courierId: '' });
  const [marker, setMarker] = useState(null);
  const [editingPage, setEditingPage] = useState(null); // { group: 'kurumsal', slug: 'hakkimizda' }
  const [pageData, setPageData] = useState({ title: '', content: '' });
  const [newCourier, setNewCourier] = useState({ name: '', phone: '', photo: '' });
  const [editingCourierId, setEditingCourierId] = useState(null);
  const [selectedHRProfile, setSelectedHRProfile] = useState(null);
  const [viewingShipment, setViewingShipment] = useState(null);
  const [viewingSubscriber, setViewingSubscriber] = useState(null);
  const [editorView, setEditorView] = useState('edit');
  const [hrView, setHrView] = useState('profile'); // 'profile' or 'form'

  const handleEditPageClick = (groupKey, slug) => {
    setEditingPage({ group: groupKey, slug });
    setPageData(pages[groupKey].items[slug]);
    window.scrollTo(0, 0);
  };

  const handlePageDataChange = (e) => {
    const { name, value } = e.target;
    setPageData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePageContentChange = (content) => {
    setPageData(prev => ({ ...prev, content }));
  };

  const handleSavePage = (e) => {
    e.preventDefault();
    setPages(prev => {
      // Derin bir kopya oluşturarak state'in doğru güncellenmesini sağlıyoruz.
      const newPages = JSON.parse(JSON.stringify(prev));
      newPages[editingPage.group].items[editingPage.slug] = pageData;
      return newPages;
    });
    alert(`'${pageData.title}' sayfası başarıyla güncellendi.`);
    setEditingPage(null);
  };

  const handleNewCourierChange = (e) => {
    const { name, value } = e.target;
    setNewCourier(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCourier = (e) => {
    e.preventDefault();
    if (!newCourier.name || !newCourier.phone || !newCourier.photo) {
      alert('Lütfen tüm çalışan bilgilerini doldurun.');
      return;
    }

    if (editingCourierId) {
      setCouriers(prev => ({ ...prev, [editingCourierId]: { ...newCourier, id: editingCourierId } }));
      alert('Çalışan bilgileri güncellendi.');
    } else {
      const courierId = newCourier.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (couriers[courierId]) {
        alert('Bu isimle bir çalışan zaten mevcut. Lütfen farklı bir isim deneyin.');
        return;
      }
      setCouriers(prev => ({ ...prev, [courierId]: { id: courierId, ...newCourier } }));
      alert('Yeni çalışan başarıyla eklendi.');
    }

    setNewCourier({ name: '', phone: '', photo: '', role: '', startDate: '', status: 'active', notes: '' });
    setEditingCourierId(null);
    setHrView('profile');
  };

  const handleStartEditCourier = (courier) => {
    setEditingCourierId(courier.id);
    setNewCourier({ name: courier.name, phone: courier.phone, photo: courier.photo, role: courier.role || '', startDate: courier.startDate || '', status: courier.status || 'active', notes: courier.notes || '' });
    setHrView('form');
  };

  const handleDeleteCourier = (courierId) => {
    if (window.confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
      const isUsed = Object.values(shipments).some(s => s.courierId === courierId);
      if (isUsed) {
        alert('Bu kurye aktif bir kargoya atanmış, bu nedenle silinemez. Önce kargoyu başka bir kuryeye atayın.');
        return;
      }
      setCouriers(prev => {
        const { [courierId]: _, ...remaining } = prev;
        return remaining;
      });
      if (selectedHRProfile?.id === courierId) setSelectedHRProfile(null);
      alert('Çalışan silindi.');
    }
  };

  const handleSiteConfigChange = (e) => setSiteConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleHRProfileUpdate = (id, field, value) => {
      setCouriers(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
      // Also update the selected profile to show changes instantly
      setSelectedHRProfile(prev => ({...prev, [field]: value}));
  };

  const handleSubscriberStatusChange = (id, newStatus) => {
    setSubscribers(prev => ({
        ...prev,
        [id]: { ...prev[id], status: newStatus }
    }));
    setViewingSubscriber(prev => ({...prev, status: newStatus}));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewShipment(prev => ({ ...prev, [name]: value }));
  };

  const handleAddShipment = (e) => {
    e.preventDefault();
    if (!marker) {
      alert('Lütfen haritadan bir konum seçin.');
      return;
    }
    if (!newShipment.courierId) {
        alert('Lütfen bir kurye seçin.');
        return;
    }
    const newTrackingNumber = newShipment.trackingNumber.trim().toUpperCase();
    if (!newTrackingNumber) {
        alert('Takip numarası zorunludur.');
        return;
    }

    const newEntry = {
      ...newShipment,
      trackingNumber: newTrackingNumber,
      currentStatus: 'received',
      estimatedDelivery: 'Hesaplanıyor...',
      coordinates: marker,
      events: [{
        timestamp: getFormattedTimestamp(),
        location: newShipment.origin,
        description: 'Paket göndericiden teslim alındı.',
        status: 'received'
      }]
    };

    setShipments(prev => ({ ...prev, [newTrackingNumber]: newEntry }));
    alert(`${newTrackingNumber} takip numaralı kargo başarıyla eklendi.`);
    // Formu sıfırla
    setNewShipment({ trackingNumber: '', sender: '', receiver: '', origin: '', destination: '', weight: '', courierId: '' });
    setMarker(null);
    setActiveTab('manage');
  };

  const handleStatusUpdate = (trackingNumber, newStatus) => {
    setShipments(prev => ({
      ...prev,
      [trackingNumber]: {
        ...prev[trackingNumber],
        currentStatus: newStatus,
        events: [
          {
            timestamp: getFormattedTimestamp(),
            location: 'Admin Panel',
            description: `Durum admin tarafından güncellendi: ${STATUS_CFG[newStatus].label}`,
            status: newStatus
          },
          ...prev[trackingNumber].events
        ]
      }
    }));
  };

  const menuItems = [
    { id: 'manage', label: 'Kargoları Yönet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 22H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 1.14-1.8L9.5 3.45a2 2 0 0 1 2.06 0L17.86 5.7a2 2 0 0 1 1.14 1.8V14"/><path d="M14 14a2 2 0 0 1-2-2V9.5a2 2 0 0 1 1.14-1.8L18.5 5.45a2 2 0 0 1 2.06 0L22 6.5"/><path d="M14 22V10"/><path d="M14 14h6v8h-6z"/><path d="M2 17h3"/><path d="M7 17h3"/></svg> },
    { id: 'add', label: 'Yeni Kargo Ekle', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { id: 'delivery_proof', label: 'Teslimat Kanıtı', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg> },
    { id: 'pages', label: 'Sayfaları Yönet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { id: 'hr', label: 'Personel Yönetimi', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'subscribers', label: 'Aboneler', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'declaration', label: 'Sözleşme', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m10 13-2 2 2 2"></path><path d="m14 13 2 2-2 2"></path></svg> },
    { id: 'invoice', label: 'Makbuz', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect></svg> },
    { id: 'settings', label: 'Genel Ayarlar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-8">
      <aside className="md:col-span-1">
        <nav className="flex flex-col space-y-1 sticky top-24">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setViewingShipment(null);
                setEditingPage(null);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors w-full text-left ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-fg hover:bg-white/5 hover:text-foreground'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="md:col-span-3">
        {activeTab === 'manage' && (
          viewingShipment ? (
            <div>
              <button onClick={() => setViewingShipment(null)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-fg hover:text-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
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
                      <div><p className="text-xs text-muted-fg">Atanan Kurye</p><p className="font-semibold">{couriers[viewingShipment.courierId]?.name || 'Bilinmiyor'}</p></div>
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
            <div>
              <h3 className="text-xl font-bold mb-6">Tüm Kargolar</h3>
              <div className="space-y-4">
                {Object.values(shipments).map(ship => {
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
          )
        )}

      {activeTab === 'add' && (
        <form onSubmit={handleAddShipment} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <input type="text" name="trackingNumber" placeholder="Takip Numarası (örn: GO-LS-003)" value={newShipment.trackingNumber} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="sender" placeholder="Gönderici Adı" value={newShipment.sender} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <input type="text" name="receiver" placeholder="Alıcı Adı" value={newShipment.receiver} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <div className="flex gap-4">
              <input type="text" name="origin" placeholder="Çıkış Noktası (örn: Pillbox Hill)" value={newShipment.origin} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
              <input type="text" name="destination" placeholder="Varış Noktası (örn: Vinewood Hills)" value={newShipment.destination} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            </div>
            <input type="text" name="weight" placeholder="Ağırlık (örn: 1.5 kg)" value={newShipment.weight} onChange={handleInputChange} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
            <div>
                <label className="text-xs text-muted-fg mb-1 block">Kurye Seçimi</label>
                <div className="flex items-center gap-3">
                    <select name="courierId" value={newShipment.courierId} onChange={handleInputChange} className="flex-grow w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required>
                        <option value="">Kurye seçin...</option>
                        {Object.values(couriers).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    {newShipment.courierId && couriers[newShipment.courierId] && (
                        <img src={couriers[newShipment.courierId].photo} alt="kurye" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white/10" />
                    )}
                </div>
            </div>
          </div>
          <div>
            <div className="h-96 mb-4">
              <AdminMap onMarkerPlace={setMarker} marker={marker} />
            </div>
            <button type="submit" className="h-12 w-full rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">Yeni Kargo Oluştur</button>
          </div>
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
                        <p className="text-xs text-muted-fg mt-2">HTML etiketleri kullanabilirsiniz. Örn: <code className="text-xs bg-black/20 px-1 py-0.5 rounded ml-1">&lt;img src="..." style="float:left; margin-right:1rem; width:150px;"&gt;</code></p>
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
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Personel Listesi</h3>
                    <button onClick={() => { setEditingCourierId(null); setNewCourier({ name: '', phone: '', photo: '', role: '', startDate: '', status: 'active', notes: '' }); setHrView('form'); }} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90 active:scale-95 transition-all">Yeni Ekle</button>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {Object.values(couriers).map(c => (
                        <button key={c.id} onClick={() => { setSelectedHRProfile(c); setHrView('profile'); }} className={`w-full text-left flex items-center gap-3 p-2 rounded-lg border transition-colors ${selectedHRProfile?.id === c.id ? 'bg-primary/10 border-primary/50' : 'bg-card border-white/[0.08] hover:border-white/20'}`}>
                            <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                            <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-fg">{c.role || 'Rol Belirtilmemiş'}</p></div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-3">
                {hrView === 'form' ? (
                    <div>
                        <h3 className="text-xl font-bold mb-6">{editingCourierId ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</h3>
                        <form onSubmit={handleSaveCourier} className="space-y-4">
                            <input type="text" name="name" placeholder="İsim Soyisim" value={newCourier.name} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                            <input type="text" name="phone" placeholder="Telefon Numarası" value={newCourier.phone} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                            <input type="text" name="photo" placeholder="Fotoğraf URL'si" value={newCourier.photo} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
                            <input type="text" name="role" placeholder="Görevi (örn: Kurye)" value={newCourier.role || ''} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                            <input type="date" name="startDate" value={newCourier.startDate || ''} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary" />
                            <select name="status" value={newCourier.status || 'active'} onChange={handleNewCourierChange} className="w-full h-10 px-4 rounded-xl border border-white/[0.08] bg-secondary"><option value="active">Aktif</option><option value="on_leave">İzinli</option><option value="terminated">İşten Ayrıldı</option></select>
                            <textarea name="notes" placeholder="Çalışan hakkında notlar..." value={newCourier.notes || ''} onChange={handleNewCourierChange} rows="3" className="w-full p-4 rounded-xl border border-white/[0.08] bg-secondary"></textarea>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setHrView('profile')} className="h-10 flex-1 rounded-xl bg-secondary text-white/80 font-semibold text-sm hover:bg-white/[0.05] transition-colors">İptal</button>
                                <button type="submit" className="h-10 flex-1 rounded-xl bg-accent text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all">{editingCourierId ? 'Değişiklikleri Kaydet' : 'Personeli Ekle'}</button>
                            </div>
                        </form>
                    </div>
                ) : selectedHRProfile ? (
                    <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-6">
                            <img src={selectedHRProfile.photo} alt={selectedHRProfile.name} className="w-24 h-24 rounded-full object-cover border-4 border-white/10" />
                            <div>
                                <h4 className="text-2xl font-bold">{selectedHRProfile.name}</h4>
                                <p className="text-primary font-semibold">{selectedHRProfile.role}</p>
                                <p className="text-sm text-muted-fg font-mono">{selectedHRProfile.phone}</p>
                            </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleStartEditCourier(selectedHRProfile)} className="text-sm px-3 py-1.5 rounded-md bg-accent text-white font-medium hover:brightness-90">Düzenle</button>
                                <button onClick={() => handleDeleteCourier(selectedHRProfile.id)} className="text-sm px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 font-medium hover:bg-red-500/30">Sil</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-xs text-muted-fg">Durum</label>
                                <select value={selectedHRProfile.status} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'status', e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm">
                                    <option value="active">Aktif</option><option value="on_leave">İzinli</option><option value="terminated">İşten Ayrıldı</option>
                                </select>
                            </div>
                            <div><label className="text-xs text-muted-fg">İşe Başlama Tarihi</label><input type="date" value={selectedHRProfile.startDate} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'startDate', e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md border border-white/[0.08] bg-secondary text-sm" /></div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-fg">Performans ve Genel Notlar</label>
                            <textarea value={selectedHRProfile.notes} onChange={e => handleHRProfileUpdate(selectedHRProfile.id, 'notes', e.target.value)} rows="5" className="w-full mt-1 p-3 rounded-md border border-white/[0.08] bg-secondary text-sm leading-relaxed"></textarea>
                        </div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
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
        <ProofOfDelivery shipments={shipments} setShipments={setShipments} couriers={couriers} />
      )}

      {activeTab === 'declaration' && (
        <DeclarationDocument />
      )}
      
      {activeTab === 'invoice' && (
        <InvoiceDocument />
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
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

// Arama Yükleme Animasyonu
const SearchLoadingAnimation = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Audio nesnesini oluştur ve çal
    audioRef.current = new Audio('/freesound_community-engine-6000.mp3');
    audioRef.current.loop = true;
    audioRef.current.play().catch(error => {
      // Tarayıcılar otomatik oynatmayı engelleyebilir, konsola bilgi verelim.
      console.error("Audio autoplay failed:", error);
    });

    // Component kaldırıldığında sesi durdurmak için cleanup fonksiyonu
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Belleği boşalt
      }
    };
  }, []); // Boş dependency array, bu etkinin sadece component mount olduğunda çalışmasını sağlar

  return (
    <>
      <style>{`
        @keyframes drive-by {
          from { left: -250px; }
          to { left: 100%; }
        }
        .animate-drive-by {
          animation: drive-by 1.8s linear infinite;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center overflow-hidden pointer-events-none">
        <img 
          src="/953374-200.png" 
          alt="Yükleniyor..." 
          className="absolute h-24 w-auto animate-drive-by"
          style={{ filter: 'brightness(0) invert(1)', top: '50%', transform: 'translateY(-50%)' }}
        />
        <p className="absolute top-1/2 mt-20 text-white font-semibold animate-pulse">Sorgulanıyor...</p>
      </div>
    </>
  );
};

// Fiyat Hesaplama Bileşeni
const PriceCalculator = () => {
  const [weight, setWeight] = useState('');
  const [distance, setDistance] = useState('city'); // 'city', 'intercity'
  const [price, setPrice] = useState(null);

  const calculatePrice = (e) => {
    e.preventDefault();
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) {
      alert('Lütfen geçerli bir ağırlık girin.');
      return;
    }

    let baseFee = distance === 'city' ? 50 : 150;
    let pricePerKg = distance === 'city' ? 15 : 45;
    const calculatedPrice = baseFee + (w * pricePerKg);
    setPrice(calculatedPrice.toFixed(2));
  };

  return (
    <div className="bg-card border border-white/[0.08] rounded-2xl p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">Hızlı Fiyat Hesaplama</h2>
      <form onSubmit={calculatePrice} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-fg mb-1 block">Ağırlık (kg)</label>
          <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Örn: 1.5" className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary" required />
        </div>
        <div><label className="text-sm font-medium text-muted-fg mb-1 block">Mesafe</label><select value={distance} onChange={e => setDistance(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-white/[0.08] bg-secondary"><option value="city">Şehir İçi</option><option value="intercity">Şehirler Arası</option></select></div>
        <button type="submit" className="h-12 w-full rounded-xl bg-accent text-white font-semibold text-sm">Hesapla</button>
      </form>
      {price !== null && (<div className="mt-6 text-center bg-primary/10 border border-primary/30 p-4 rounded-xl"><p className="text-muted-fg">Tahmini Gönderim Ücreti</p><p className="text-3xl font-bold text-primary">${price}</p></div>)}
    </div>
  );
};

export default function Home() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [shipments, setShipments] = useState(DATA);
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [couriers, setCouriers] = useState(INITIAL_COURIERS);
  const [subscribers, setSubscribers] = useState(INITIAL_SUBSCRIBERS);
  const [siteConfig, setSiteConfig] = useState(INITIAL_SITE_CONFIG);
  const [currentView, setCurrentView] = useState({ type: 'default' }); // types: default, searchResult, error, admin, page, createShipment

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query || isLoading) return;

    setIsLoading(true);
    setCurrentView({ type: 'default' }); // Yeni arama için görünümü sıfırla

    setTimeout(() => {
      const upperQuery = query.trim().toUpperCase();
      const ship = shipments[upperQuery];
      if (ship) {
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

  const handleCreatePublicShipment = (formData) => {
    const courierIds = Object.keys(couriers);
    const randomCourierId = courierIds[Math.floor(Math.random() * courierIds.length)];
    
    let newTrackingNumber;
    do {
        newTrackingNumber = `GO-LS-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (shipments[newTrackingNumber]);

    const newEntry = {
        trackingNumber: newTrackingNumber,
        sender: formData.sender,
        receiver: formData.receiver,
        origin: formData.originAddress,
        destination: formData.destinationAddress,
        signatureDataUrl: formData.signatureDataUrl,
        weight: formData.weight,
        currentStatus: 'received',
        estimatedDelivery: 'Hesaplanıyor...',
        courierId: randomCourierId,
        coordinates: { x: 50 + Math.random() * 20, y: 50 + Math.random() * 20 }, // Random destination for demo
        events: [{
            timestamp: getFormattedTimestamp(),
            location: formData.originAddress,
            description: 'Gönderi bilgileri alındı',
            status: 'received'
        }]
    };

    const newShipments = { ...shipments, [newTrackingNumber]: newEntry };
    setShipments(newShipments);
    
    alert(`Gönderiniz başarıyla oluşturuldu! Takip numaranız: ${newTrackingNumber}`);
    setCurrentView({ type: 'searchResult', data: newEntry });
  };

  const handleNewSubscription = (formData) => {
    const newId = `SUB-${Date.now()}`;
    const newSubscriber = {
        id: newId,
        ...formData,
        status: 'pending', // 'pending', 'active', 'cancelled'
        createdAt: new Date().toISOString()
    };
    setSubscribers(prev => ({ ...prev, [newId]: newSubscriber }));
    alert('Abonelik başvurunuz başarıyla alınmıştır. En kısa sürede sizinle iletişime geçilecektir.');
    setCurrentView({ type: 'default' });
  };

  const handleLogin = (username, password) => {
    if (username === 'gopostaladmin' && password === 'gospotal123') {
      setCurrentView({ type: 'admin' });
      setIsLoginOpen(false);
      return true; // Giriş başarılı
    }
    return false; // Giriş başarısız
  };

  const handleLogout = () => {
    setCurrentView({ type: 'default' });
  };

  const handleGoHome = () => {
    setCurrentView({ type: 'default' });
  }

  const handleShowPage = (slug) => {
    if (slug === 'kargo-takip') {
      handleGoHome();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (slug === 'gonderim-olustur') {
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
        return <div className="py-8"><AdminPanel shipments={shipments} setShipments={setShipments} pages={pages} setPages={setPages} couriers={couriers} setCouriers={setCouriers} siteConfig={siteConfig} setSiteConfig={setSiteConfig} subscribers={subscribers} setSubscribers={setSubscribers} /></div>;

      case 'createShipment':
        return <CreateShipmentForm onCreateShipment={handleCreatePublicShipment} />;
      
      case 'subscribe':
        return <SubscriptionForm onSubscribe={handleNewSubscription} />;

      case 'page':
        if (currentView.slug === 'fiyat-hesapla') {
            return (
                <div className="pb-16">
                    <PriceCalculator />
                </div>
            );
        }
        return (
          <div className="pb-16">
            <div className="bg-card border border-white/[0.08] rounded-2xl p-6 sm:p-10">
              <h1 className="text-3xl font-bold text-primary mb-6">{currentView.data.title}</h1>
              <div className="min-h-[30vh]">
                {currentView.data.content ? (
                  <div 
                    className="prose prose-invert max-w-none text-foreground/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: currentView.data.content }}
                  />
                ) : (
                  <p className="text-muted-fg">Bu sayfanın içeriği henüz yönetici tarafından oluşturulmadı.</p>
                )}
              </div>
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
      const cfg = STATUS_CFG[shipment.currentStatus];
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
                  const dotCls = isCurrent ? 'bg-primary border-primary text-white shadow-[0_0_14px_rgba(237,58,50,0.4)]' : isCompleted ? 'bg-primary/20 border-primary/60 text-primary' : 'bg-card border-white/[0.08] text-muted-fg';
                  const lblCls = isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-fg';
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${dotCls}`}>
                        <span className="text-xs font-bold">{isCompleted && !isCurrent ? '✓' : i + 1}</span>
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${lblCls}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 rounded-xl border border-white/[0.08] bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Kurye Bilgileri</h3>
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
            <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-card p-5">
               <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Canlı Konum</h3>
               <UserMap coordinates={shipment.coordinates} />
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
                  const ecfg = STATUS_CFG[ev.status];
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
      
      default: // 'default' view
        return (
          <div className="pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 hover:border-primary/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors text-primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="1" y="3" rx="2" /><path d="M1 9h16" /><path d="M1 14h16" /></svg></div>
                <h3 className="font-semibold mb-1.5">Canlı Takip</h3><p className="text-sm text-muted-fg leading-relaxed">Kargonuzun anlık konumunu ve durumunu gerçek zamanlı olarak takip edin.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 hover:border-primary/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors text-primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
                <h3 className="font-semibold mb-1.5">Hızlı Sorgulama</h3><p className="text-sm text-muted-fg leading-relaxed">Takip numaranızla saniyeler içinde kargo bilgilerinize ulaşın.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-card p-5 hover:border-primary/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors text-primary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                <h3 className="font-semibold mb-1.5">Teslim Bildirimi</h3><p className="text-sm text-muted-fg leading-relaxed">Kargonuz teslim edildiğinde anında SMS ve e-posta bildirimi alın.</p>
              </div>
            </div>
          </div>
        );
    }
  }

  return (
    <>
      <style jsx global>{`
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-image: url('https://i.imgur.com/Rc0TD5q.png');
          background-size: cover;
          background-position: center;
          opacity: 0.07;
          z-index: -1;
        }
      `}</style>
      {isAppLoading && <LoadingScreen onFinished={() => setIsAppLoading(false)} />}
      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onLogin={handleLogin} />}
      {isLoading && <SearchLoadingAnimation />}

      <header className="border-b border-white/[0.08] sticky top-0 z-50 backdrop-blur-md bg-[#0d0f14]/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={handleGoHome} className="flex items-center gap-2.5 cursor-pointer">
            <img src="/gtawtr-go.webp" alt="GoPostal Logo" className="w-12 h-12" />
            <span className="font-bold text-lg tracking-tight">GoPostal<span className="text-primary">.</span></span>
          </button>
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-fg">
            <button onClick={() => handleShowPage('kargo-takip')} className="px-4 py-2 rounded-md hover:text-foreground hover:bg-white/5 transition-colors">Kargo Takip</button>
            {siteConfig.headerNav.map(link => (
              <button key={link.slug} onClick={() => handleShowPage(link.slug)} className="px-4 py-2 rounded-md hover:text-foreground hover:bg-white/5 transition-colors">
                {link.title}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {currentView.type === 'admin' ? (
              <>
                <span className="text-sm text-muted-fg hidden sm:block">Hoşgeldin, Admin</span>
                <button onClick={handleLogout} className="text-sm px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-medium hover:bg-red-500/30 transition-colors">Çıkış Yap</button>
              </>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className="text-sm px-4 py-2 rounded-lg bg-accent text-white font-medium hover:brightness-90 transition-colors">Giriş Yap</button>
            )}
          </div>
        </div>
      </header>

      <main>
        {['default', 'searchResult', 'error'].includes(currentView.type) && (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.08] blur-[120px] pointer-events-none rounded-full"></div>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 relative z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot"></span>
                  Gerçek Zamanlı Paket Takibi
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
                  Paketinizi anında<br />
                  <span className="text-primary">takip edin</span>
                </h1>
                <p className="text-muted-fg text-lg mb-8 leading-relaxed">
                  Takip numaranızı girerek paketinizin nerede olduğunu, ne zaman teslim edileceğini öğrenin.
                </p>
                <form onSubmit={handleSearch} id="search-form" className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Takip numaranızı girin (örn: GO-LS-001)"
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.08] bg-secondary text-foreground placeholder:text-muted-fg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" />
                  </div>
                  <button type="submit" id="search-form-submit-button" disabled={isLoading} className="h-12 px-6 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-90 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2 whitespace-nowrap">
                    <span>Sorgula</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </button>
                </form>
                <p className="text-xs text-muted-fg mt-3">
                  Demo için deneyin:
                  <button onClick={() => handleDemoClick('GO-LS-001')} className="text-primary hover:underline font-mono text-xs">GO-LS-001</button>
                  {' '}veya{' '}
                  <button onClick={() => handleDemoClick('GO-PB-002')} className="text-primary hover:underline font-mono text-xs">GO-PB-002</button>
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {renderMainContent()}
        </div>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/gtawtr-go.webp" alt="GoPostal Logo" className="w-8 h-8" />
                <span className="font-bold">GoPostal<span className="text-primary">.</span></span>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">San Andreas genelinde hızlı, güvenilir ve şeffaf kargo hizmetleri sunuyoruz.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              {Object.entries(pages).map(([groupKey, groupData]) => (
                <div key={groupKey}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3">{groupData.title}</p>
                  <ul className="space-y-2">
                    {Object.entries(groupData.items).map(([slug, item]) => (
                      <li key={slug}>
                        <button onClick={() => handleShowPage(slug)} className="text-left text-xs text-muted-fg hover:text-foreground transition-colors">
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted-fg">© 2026 GoPostal. Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-4 text-xs">
              <a href={`tel:${siteConfig.phone}`} className="flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors">📞 {siteConfig.phone}</a>
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-1.5 text-muted-fg hover:text-foreground transition-colors">✉️ {siteConfig.email}</a>
              <a href="#" className="flex items-center gap-1.5 hover:text-foreground transition-colors">🌐 Türkçe</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
