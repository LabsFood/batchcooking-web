import { SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

let loggerProvider: LoggerProvider | null = null
let shutdownHookRegistered = false

/**
 * Configure un exporteur dédié aux quelques logs d'observabilité créés ici.
 * Les sorties existantes (console, Sentry, etc.) ne sont volontairement pas
 * raccordées à ce provider.
 */
export function configurePostHogServerLogs(): void {
  if (loggerProvider) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) {
    if (process.env.NODE_ENV !== 'production') {
      const variable = !key ? 'NEXT_PUBLIC_POSTHOG_KEY' : 'NEXT_PUBLIC_POSTHOG_HOST'
      console.warn(
        `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
      )
    }
    return
  }

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ 'service.name': 'labs-food-batch-cooking-web' }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, '')}/i/v1/logs`,
          timeoutMillis: 2000,
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        }),
      }),
    ],
  })

  if (!shutdownHookRegistered) {
    shutdownHookRegistered = true
    process.once('beforeExit', () => {
      void loggerProvider?.forceFlush().catch(() => undefined)
    })
  }
}

/** Émet seulement les lignes créées par cette intégration, via son provider dédié. */
export function logServerInstrumentation(message: string, attributes: Record<string, string>): void {
  const logger = loggerProvider?.getLogger('labs-food.posthog-server-instrumentation')
  logger?.emit({
    body: message,
    severityNumber: SeverityNumber.INFO,
    attributes,
  })
}
