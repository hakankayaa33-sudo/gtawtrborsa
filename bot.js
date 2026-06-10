import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Discord Webhook Yardımcı Fonksiyonu
const sendDiscordNotification = async (content, embed = null) => {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Discord Webhook URL bulunamadı (NEXT_PUBLIC_DISCORD_WEBHOOK_URL)");
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: content,
        embeds: embed ? [embed] : [] 
      })
    });
  } catch (err) { console.error("Discord Webhook Hatası:", err); }
};

// Discord Embed Şablon Oluşturucu
const getDiscordStatusEmbed = (status, customerName, trackingNumber, customerDiscord = null) => {
  const customer = customerName || "Değerli Müşterimiz";
  let description = "";
  let color = 3447003; // Varsayılan Mavi

  switch(status) {
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
    footer: { text: "GoPostal Lojistik Sistemleri | gopostal.online" },
    timestamp: new Date().toISOString(),
    fields: fields.length > 0 ? fields : undefined
  };
};

// Dosya ana dizinde olduğu için doğrudan .env.local dosyasını hedef alıyoruz
const envPath = path.resolve(process.cwd(), '.env.local');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
    console.error(`❌ Hata: .env.local dosyası okunamadı! Aranan yol: ${envPath}`);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // Kullanıcıları bulup DM atabilmek için gerekli
        GatewayIntentBits.DirectMessages
    ]
});

// Supabase Bağlantısı
// Botlar güvenli ortamda çalıştığı için 'service_role' key kullanmak RLS engellerini aşmanızı sağlar.
// .env.local dosyanıza SUPABASE_SERVICE_ROLE_KEY eklerseniz bot çok daha sağlıklı çalışır.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

if (process.env.SUPABASE_SERVICE_ROLE_KEY) console.log("🔑 Bilgi: Service Role Key algılandı, RLS bypass aktif.");

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Hata: Supabase URL veya Key .env dosyasında bulunamadı!");
    process.exit(1);
}

if (supabaseUrl.includes('your-project.supabase.co')) {
    console.error("❌ Hata: .env dosyasındaki Supabase URL'si hala örnek (placeholder) değerinde! Lütfen gerçek URL'nizi girin.");
    process.exit(1);
}

// Node.js ortamında WebSocket kütüphanesini global olarak tanımlamak 
global.WebSocket = WebSocket;

console.log("ℹ️ Supabase bağlantısı başlatılıyor...");
const supabase = createClient(
    supabaseUrl.replace(/\/$/, ''), 
    supabaseKey,
    {
        auth: {
            persistSession: false 
        },
        realtime: {
            WebSocket: WebSocket, 
        }
    }
);
console.log("✅ Supabase istemcisi hazır.");

// Şube Müdürü Bildirim Kanalı ID'si
const MANAGER_CHANNEL_ID = process.env.MANAGER_CHANNEL_ID;
if (!MANAGER_CHANNEL_ID) {
    console.warn("⚠️ Uyarı: MANAGER_CHANNEL_ID .env.local dosyasında tanımlı değil!");
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Discord Botu Aktif: ${client.user.tag}`);
    console.log("ℹ️ Supabase Realtime kanalları dinlenmeye başlandı...");

    supabase
        .channel('realtime_notifications')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shipments' }, async (payload) => {
            console.log(`🔔 Realtime: shipments tablosunda UPDATE saptandı (${payload.new.trackingNumber})`);
            const newItem = payload.new;
            const oldItem = payload.old;

            if (newItem.email) {
                const discordTag = newItem.email.trim();

                console.log(`🔍 Arama başlatıldı: ${discordTag} sunucularda aranıyor...`);
                let found = false;

                for (const guild of client.guilds.cache.values()) {
                    try {
                        const members = await guild.members.fetch({ query: discordTag, limit: 10 });
                        // Küçük harfe çevirerek karşılaştırıyoruz (saintvor_ vs Saintvor_ karmaşasını çözer)
                        const member = members.find(m => m.user.tag.toLowerCase() === discordTag.toLowerCase() || m.user.username.toLowerCase() === discordTag.toLowerCase());
                        
                        if (member) {
                            // Use the new embed function
                            const embed = getDiscordStatusEmbed(newItem.currentStatus, newItem.sender, newItem.trackingNumber, discordTag);
                            await member.send({ embeds: [embed] }).then(() => console.log(`✅ DM başarıyla gönderildi: ${discordTag}`)).catch(err => console.error(`❌ DM gönderilemedi (${discordTag}):`, err.message));
                            found = true;
                            break;
                        }
                    } catch (err) { 
                        console.error("Üye aranırken hata oluştu:", err.message); 
                    }
                }
                if (!found) console.log(`⚠️ Uyarı: ${discordTag} isminde bir kullanıcı sunucularda bulunamadı.`);
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shipments' }, async (payload) => {
            const newItem = payload.new;
            console.log(`🔔 Realtime: shipments tablosunda INSERT saptandı (${newItem.trackingNumber})`);
            console.log("   -> Gönderen:", newItem.sender, " | Discord:", newItem.email);

            const channel = await client.channels.fetch(MANAGER_CHANNEL_ID).catch((err) => {
                console.error("❌ Kanal çekme hatası:", err.message);
                return null;
            });
            if (channel) {
                await channel.send({
                    content: `🔔 **[YENİ KARGO]** Şube Müdürü, yeni bir kargo oluşturuldu!\n📦 **Takip No:** \`${newItem.trackingNumber}\`\n👤 **Gönderen:** ${newItem.sender}\n🎮 **Discord:** ${newItem.email || 'Belirtilmedi'}\n📍 **Varış:** ${newItem.destination}\n\n🌐 gopostal.online`
                }).then(() => console.log("   -> Bildirim başarıyla gönderildi.")).catch(err => console.error("   -> Mesaj gönderme hatası:", err.message));
            } else {
                console.error("❌ MANAGER_CHANNEL_ID ile belirtilen kanal bulunamadı!");
            }

            // Gönderene DM Atma (Anında Bildirim)
            if (newItem.email) {
                const discordTag = newItem.email.trim();
                for (const guild of client.guilds.cache.values()) {
                    try {
                        const members = await guild.members.fetch({ query: discordTag, limit: 10 });
                        const member = members.find(m => m.user.tag.toLowerCase() === discordTag.toLowerCase() || m.user.username.toLowerCase() === discordTag.toLowerCase());
                        
                        if (member) {
                            const embed = getDiscordStatusEmbed('received', newItem.sender, newItem.trackingNumber, discordTag);
                            await member.send({ embeds: [embed] }).then(() => console.log(`✅ Kayıt DM'si gönderildi: ${discordTag}`)).catch(err => console.error(`❌ Kayıt DM hatası (${discordTag}):`, err.message));
                            break;
                        }
                    } catch (err) { 
                        console.error("Üye aranırken hata (INSERT DM):", err.message); 
                    }
                }
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invoices' }, async (payload) => {
            console.log("🔔 Yeni fatura oluşturuldu, bildirim hazırlanıyor.");
            const invoice = payload.new;
            const { data: shipment, error: shipErr } = await supabase.from('shipments').select('*').eq('trackingNumber', invoice.shipment_id).single();

            if (shipErr) {
                console.error("❌ Fatura için kargo bilgisi çekilirken hata:", shipErr.message);
                return;
            }

            if (shipment && shipment.email) {
                const discordTag = shipment.email;
                for (const guild of client.guilds.cache.values()) {
                    try {
                        const members = await guild.members.fetch({ query: discordTag, limit: 10 });
                        const member = members.find(m => m.user.tag.toLowerCase() === discordTag.toLowerCase() || m.user.username.toLowerCase() === discordTag.toLowerCase());
                        if (member) {
                            await member.send(`📄 **Sayın ${shipment.sender},**\n\n\`${shipment.trackingNumber}\` numaralı gönderiniz için faturanız oluşturulmuştur.\n📦 **Gönderi:** ${shipment.origin} ➔ ${shipment.destination}\n🌐 Detaylar için web sitemizi ziyaret edebilirsiniz.\n\n🔗 gopostal.online`).then(() => console.log(`✅ Fatura DM gönderildi: ${discordTag}`)).catch(err => console.error(`❌ Fatura DM hatası:`, err.message));
                            break;
                        }
                    } catch (err) { console.error("Üye aranırken hata oluştu (Fatura):", err.message); }
                }
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_mails' }, async (payload) => {
            const newMail = payload.new;
            console.log(`🔔 Realtime: internal_mails tablosunda INSERT saptandı (Mail ID: ${newMail.id})`);

            // Alıcının Discord etiketini bulmak için couriers tablosunu kontrol et
            const { data: receiverCourier, error: receiverError } = await supabase
                .from('couriers')
                .select('name, discord_tag') // discord_tag alanını couriers tablosuna eklediğinizi varsayıyoruz
                .eq('id', newMail.receiver_id)
                .single();

            if (receiverError || !receiverCourier || !receiverCourier.discord_tag) {
                console.warn(`⚠️ Uyarı: Mail alıcısı (${newMail.receiver_id}) için Discord etiketi bulunamadı veya hata oluştu:`, receiverError?.message);
                return;
            }

            const discordTag = receiverCourier.discord_tag.trim();
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch({ query: discordTag, limit: 10 });
                    const member = members.find(m => m.user.tag.toLowerCase() === discordTag.toLowerCase() || m.user.username.toLowerCase() === discordTag.toLowerCase());
                    
                    if (member) {
                        await member.send(`📧 **Yeni İç Mailiniz Var!**\n\n**Gönderen:** ${newMail.sender_id}\n**Konu:** ${newMail.subject}\n\nDetaylar için iç panelinizi kontrol edin.\n\n🌐 gopostal.online`)
                            .then(() => console.log(`✅ Yeni mail bildirimi DM gönderildi: ${discordTag}`))
                            .catch(err => console.error(`❌ Yeni mail bildirimi DM hatası (${discordTag}):`, err.message));
                        break;
                    }
                } catch (err) { 
                    console.error("Üye aranırken hata (Internal Mail DM):", err.message); 
                }
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log("✅ Supabase Realtime bağlantısı BAŞARILI!");
            if (status === 'CLOSED') console.log("⚠️ Supabase Realtime bağlantısı kapandı.");
            if (status === 'CHANNEL_ERROR') console.error("❌ Supabase Realtime HATASI! (Dashboard'dan Replication ayarını kontrol et!)");
        });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'kargotalebiolustur') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const trackingNumber = `GO-DS-${Math.floor(1000 + Math.random() * 9000)}`;
            const timestamp = new Date().toLocaleString('tr-TR');
            const newEntry = {
                trackingNumber,
                senderDiscordTag: interaction.user.tag,
                sender: interaction.user.username,
                receiver: "Belirtilmedi",
                origin: "Discord Talebi",
                destination: "Belirtilmedi",
                weight: "1.0 kg",
                currentStatus: 'received',
                estimatedDelivery: 'Hesaplanıyor...',
                events: [{
                    timestamp,
                    location: "Discord",
                    description: "Kargo talebi Discord üzerinden oluşturuldu.",
                    status: "received"
                }]
            };
            const { error } = await supabase.from('shipments').insert([newEntry]);
            if (error) throw error;
            await interaction.editReply({
                content: `✅ **Talebiniz sisteme başarıyla işlendi!**\n\n📦 **Takip Numaranız:** \`${trackingNumber}\`\n🌐 Sitemiz üzerinden kargonuzu takip edebilirsiniz.`
            });
        } catch (error) {
            console.error("API Hatası:", error);
            await interaction.editReply('❌ Kargo oluşturulurken veritabanı hatası meydana geldi.');
        }
    }
});

// Token kontrolü ve temizleme
const token = process.env.DISCORD_TOKEN?.trim();

if (!token) {
    console.error("❌ Hata: DISCORD_TOKEN .env.local dosyasında bulunamadı veya boş!");
    process.exit(1);
}

client.login(token);