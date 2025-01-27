import { Context, Schema, Logger } from 'koishi'

export const name = 'tdz-img'
export const inject = ['logger']
export interface Config {
  qq: string
  key: string
  defaultWidth?: number
  defaultHeight?: number
  tips: string
}

export const usage = 'key获取地址：https://api.tangdouz.com/a/sd/web/\n本插件不能自定义api端点，仅用于tdz的AI绘画接口！生成的图片均与插件作者无关！'

export const Config: Schema<Config> = Schema.object({
  qq: Schema.string().description('您的注册QQ'),
  key: Schema.string().description('您的注册QQ的key'),
  defaultWidth: Schema.number().default(512).description('默认图片宽度'),
  defaultHeight: Schema.number().default(512).description('默认图片高度'),
  tips: Schema.string().description('生成时的提示').default('图片生成中，请稍后...'),
})
const logger = new Logger('tdz');
export function apply(ctx: Context, config: Config) {
  ctx.command('tdz <tags:text>', '生成AI绘画图片')
    .option('width', '-wi <width:number>', { fallback: config.defaultWidth})
    .option('height', '-he <height:number>', { fallback: config.defaultHeight})
    .action(async ({ session, options }, tags) => {
      if (!tags) return '请提供描述词，例如：1girl,loli'
      const apiUrl = `https://api.tangdouz.com/a/sd/draw.php?qq=${config.qq}&key=${config.key}&f=1&tag=${encodeURIComponent(tags)}&w=${options.width}&h=${options.height}`
      await session.send(config.tips)
      //logger.info(apiUrl)
        const response = await ctx.http.get(apiUrl, { responseType: 'text' })
        //logger.info(response)
        const match = response.match(/±img=(.*?)±/)
        if (match && match[1]) {
          return `<img src='${match[1]}' />`
        }
        return '图片生成失败，未能获取有效链接。'
    })
}
