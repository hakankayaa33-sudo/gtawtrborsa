import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from 'discord.js';
import 'dotenv/config'; // .env dosyasını Node.js'e okutur

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Render.com'daki C# API adresin
const API_URL = 'https://gopostal.onrender.com/api/Kargo/discord-talep';
// Sitenin Güvenlik Anahtarı
const API_KEY = 'MTUwODI4MjIzNDI2MjY1NTE2Nw.G6Q_P1.a9up-6OC-G5KUUyeEyGgSBdRgeMH4qV50OnH2w';

client.once(Events.ClientReady, () => {
    console.log(`✅ Discord Botu Aktif: ${client.user.tag}`);
});

// "!kargo" yazıldığında kanala butonlu mesaj atar
client.on(Events.MessageCreate, async (message) => {
    if (message.content === '!kargo') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kargotalebiolustur')
                .setLabel('📦 Kargo Talebi Oluştur')
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({ 
            content: 'GoPostal sisteminde yeni bir kargo oluşturmak için aşağıdaki butona tıklayın:', 
            components: [row] 
        });
    }
});

// Butona tıklandığında çalışacak olay (Interaction)
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'kargotalebiolustur') {
        await interaction.deferReply({ ephemeral: true }); // Sadece tıklayan kişiye "Bekleniyor..." mesajı gösterir

        try {
            // C# API'ye Kargo oluşturma isteği gönder
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
                body: JSON.stringify({ discordUser: interaction.user.username, alici: "Discord Üzerinden Belirtilmedi" })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`✅ **Talebiniz sisteme başarıyla işlendi!**\n\n📦 **Takip Numaranız:** \`${data.trackingNumber}\`\n🌐 Sitemiz üzerinden kargonuzu takip edebilirsiniz.`);
            } else {
                await interaction.editReply('❌ Kargo oluşturulurken bir hata meydana geldi.');
            }
        } catch (error) {
            console.error("API Hatası:", error);
            await interaction.editReply('❌ **Sunucuya (API) ulaşılamıyor.**\nLütfen Render.com üzerindeki API projenizin "Live" (aktif) olduğundan emin olun.');
        }
    }
});

// Tokeni .env dosyasından güvenli bir şekilde çekiyoruz
client.login(process.env.DISCORD_TOKEN);