import { Context, Schema, Logger } from 'koishi'

export const name = 'tdz-img'
export const inject = ['logger']

export interface Config {
  qq: string
  key: string
  defaultWidth?: number
  defaultHeight?: number
  tips: string
  debug: boolean
}

export const usage = 'key获取地址：https://api.tangdouz.com/a/sd/web/\n本插件不能自定义api端点，仅用于tdz的AI绘画接口！生成的图片均与插件作者无关！'

export const Config: Schema<Config> = Schema.object({
  qq: Schema.string().description('您的注册QQ'),
  key: Schema.string().description('您的注册QQ的key'),
  defaultWidth: Schema.number().default(512).description('默认图片宽度'),
  defaultHeight: Schema.number().default(512).description('默认图片高度'),
  tips: Schema.string().description('生成时的提示').default('图片生成中，请稍后...'),
  debug: Schema.boolean().default(false).description('是否启用调试日志'),
})

const logger = new Logger('tdz')

/**
 * 检测字符串是否包含中文
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

/**
 * 调用翻译 API 翻译中文 tag
 */
async function translateTag(ctx: Context, tag: string, debug: boolean): Promise<string> {
  try {
    const apiUrl = `https://api.tangdouz.com/fy.php?nr=${encodeURIComponent(tag)}&return=json`
    const response = await ctx.http.get(apiUrl, { responseType: 'text' }) // 以纯文本形式获取响应

    if (debug) logger.info(`翻译 API 请求: ${apiUrl}`)
    if (debug) logger.info(`翻译 API 响应: ${response}`)

    // 解析 JSON 但先确保它是合法的 JSON 结构
    try {
      const json = JSON.parse(response)
      if (json?.译文) {
        return json.译文.trim()
      }
    } catch (err) {
      if (debug) logger.warn(`翻译 API 返回了无法解析的内容: ${response}`)
    }

    if (debug) logger.warn(`翻译失败: ${tag}`)
    return tag // 翻译失败时返回原文本
  } catch (error) {
    if (debug) logger.error(`翻译 API 请求出错: ${error}`)
    return tag
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.command('tdz <tags:text>', '生成AI绘画图片')
    .option('width', '-wi <width:number>', { fallback: config.defaultWidth })
    .option('height', '-he <height:number>', { fallback: config.defaultHeight })
    .action(async ({ session, options }, ...tags) => {
      if (!tags.length) return '请提供描述词，例如：1girl,loli'

      // Koishi 解析参数时，会自动拆分以空格分隔的部分
      // 但用户输入的 , 仍然是 tag 的一部分，所以我们要手动恢复
      let tagList = tags.join(' ') // 先用空格连接，确保 tag 内的空格不丢失

      // 按 , 分割，保证用户输入的逗号仍然是分隔符
      const tagParts = tagList.split(',').map(tag => tag.trim()) // 确保去掉前后空格

      // 检测并翻译中文 tag
      for (let i = 0; i < tagParts.length; i++) {
        if (containsChinese(tagParts[i])) {
          tagParts[i] = await translateTag(ctx, tagParts[i], config.debug)
        }
      }
      const translatedTags = tagParts.join(',') // 重新组合为 API 需要的格式

      const apiUrl = `https://api.tangdouz.com/a/sd/draw.php?qq=${config.qq}&key=${config.key}&f=1&tag=${encodeURIComponent(translatedTags)}&w=${options.width}&h=${options.height}`
      
      await session.send(config.tips)

      if (config.debug) logger.info(`API 请求: ${apiUrl}`)

      try {
        const response = await ctx.http.get(apiUrl, { responseType: 'text' })
        
        if (config.debug) logger.info(`API 响应: ${response}`)

        const match = response.match(/±img=(.*?)±/)
        if (match && match[1]) {
          return `<img src='${match[1]}' />`
        }
        return '图片生成失败，未能获取有效链接。'
      } catch (error) {
        if (config.debug) logger.error(`API 请求失败: ${error}`)
        return '请求失败，请稍后重试。'
      }
    })
}
