import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { User, user } from './users.js'
import { openai } from './openai.js'
import { removeFile } from './utils.js'
import { initCommand, processTextToChat, INITIAL_SESSION } from './logic.js'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', initCommand)
bot.command('new user', User.addUser)

bot.command('start', initCommand)

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION
  try {
    const userId = String(ctx.message.from.id)
    if (user.find(n => n == userId)) {
      await ctx.reply(code('Голосовое сообщение принял. Жду ответ от сервера...'))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    removeFile(oggPath)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Ваш запрос: ${text}`))

    await processTextToChat(ctx, text)
    } else {
      await ctx.reply(code(`Вы не прошли аутентификацию` ))
    }
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})

bot.on(message('text'), async (ctx) => {
  const userId = String(ctx.message.from.id)
  ctx.session ??= INITIAL_SESSION
  try {
    if (user.find(n => n == userId)) {
      const text = ctx.message.text;
      await ctx.reply(code(`Сообщение принял. Жду ответ от сервера...`))
     
  
  
    

await processTextToChat(ctx, ctx.message.text)
    } else {
      await ctx.reply(code(`Вы не прошли аутентификацию ${userId}`))
    }
    
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

