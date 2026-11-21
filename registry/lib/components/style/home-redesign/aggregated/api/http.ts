import { getJsonWithCredentials } from '@/core/ajax'

/** 网络/解析失败时使用的本地错误码, 与 B 站业务 code 区分. */
export const NETWORK_ERROR_CODE = -1

/** B 站接口错误: 非零业务 code 或本地网络/解析失败. */
export class BilibiliApiError extends Error {
  constructor(public readonly code: number, message: string, public readonly endpoint: string) {
    super(message)
    this.name = 'BilibiliApiError'
  }
}

export const assertCode = (json: { code: number; message?: string }, endpoint: string) => {
  if (json.code !== 0) {
    throw new BilibiliApiError(json.code, json.message ?? 'unknown error', endpoint)
  }
}

interface ApiResponse<T> {
  code: number
  message?: string
  data?: T
}

/** 带 cookie 请求 JSON; 非零 code 与网络/解析错误统一抛 BilibiliApiError. */
export const requestJson = async <T>(url: string, endpoint: string): Promise<T> => {
  let json: ApiResponse<T>
  try {
    json = await getJsonWithCredentials<ApiResponse<T>>(url)
  } catch (error) {
    throw new BilibiliApiError(
      NETWORK_ERROR_CODE,
      error instanceof Error ? error.message : String(error),
      endpoint,
    )
  }
  assertCode(json, endpoint)
  return json.data as T
}

/** 把接口错误转成可展示的短文案. */
export const formatApiError = (error: BilibiliApiError): string => {
  switch (error.code) {
    case -101:
      return '登录后查看'
    case -352:
      return '请求被风控, 请稍后重试'
    case -404:
      return '内容不存在'
    case NETWORK_ERROR_CODE:
      return `网络错误: ${error.message}`
    default:
      return `${error.message} (${error.code})`
  }
}
