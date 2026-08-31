const MINI_APP_URL = 'https://itslemme.github.io/party-bets/';
const SUPPORT_URL = 'https://t.me/LLLEMME';

const KEYBOARD = {
  inline_keyboard: [
    [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }],
    [{ text: '🛟 Поддержка', url: SUPPORT_URL }],
  ],
};

const WELCOME_TEXT =
  'Привет! 👋 Это Party Bets — игра в ставки на события вечеринки.\n\n' +
  '🎮 Жми «Играть», чтобы открыть приложение\n' +
  '🛟 «Поддержка» — если что-то не работает';

async function tg(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Party Bets bot webhook is running.', { status: 200 });
    }

    // Verify the request actually came from Telegram
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response('bad request', { status: 400 });
    }

    const msg = update.message;
    if (msg && msg.chat && msg.chat.id) {
      await tg(env.BOT_TOKEN, 'sendMessage', {
        chat_id: msg.chat.id,
        text: WELCOME_TEXT,
        reply_markup: KEYBOARD,
      });
    }

    // Telegram just needs a 200 OK; it doesn't care about the body.
    return new Response('ok', { status: 200 });
  },
};
