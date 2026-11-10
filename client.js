/**
 * Browser half of dsh-codex-usage-panel.
 *
 * Two surfaces, both fed from the same store:
 *
 *  - a card pinned at the sidebar foot (`sidebar.footer.action`), the seat the
 *    shell renders directly above the Settings entry. It is the bottom-most
 *    content of the left column and is modelled on the Command Code panel's
 *    card: a quota ring, the product name, a status badge, then one row per
 *    quota window (label · reset time · percentage) over a full-width bar. In
 *    the 56px rail it collapses to a single icon button carrying the ring.
 *  - a full dashboard registered in the root `main` keyed slot, which the card
 *    opens through `ctx.layout.selectPanel`.
 *
 * Data is NOT read from the ChatGPT API here. It comes from the
 * `dsh-codex-subscription` plugin over its authenticated browser bridge:
 * `POST /api/codex-subscription/status` and `.../usage`. That plugin owns the
 * OAuth credential, the usage cache and the quota projection, so this panel is
 * a pure reader of what it reports — one source of truth, no second credential
 * path, and values that cannot disagree with the Codex panel beside it.
 *
 * When that bridge is absent (the Codex plugin is not installed or not
 * enabled) the card renders nothing rather than an error surface: a plugin's
 * dependency being missing is an installation fault, not a quota state.
 */
window.__ModuleLoader__.load({
	id: 'dsh-codex-usage-panel',
	factory(require) {
		'use strict'

		/** React comes from the shell's module table; the bundle ships no copy. */
		const React = require('react')
		const h = React.createElement

		/** This package's name: the module id, the style owner and log prefix. */
		const PACKAGE_NAME = 'dsh-codex-usage-panel'
		/** Shared by the `main` slot key and the footer card, so the card selects this panel. */
		const PANEL_ID = 'codex-usage-panel'
		/** Last entry in the sidebar foot: below the Cordis panel (0) and Command Code (1). */
		const FOOTER_ORDER = 2
		/** Locale namespace registered by this bundle. */
		const LOCALE_NS = 'codex-usage-panel'
		/** Stylesheet id; keeps the injected tag idempotent and owned. */
		const CSS_ID = PACKAGE_NAME + '/CodexUsagePanel.css'
		/** The shell's authenticated RPC bridge root. */
		const RPC_CHANNEL = '/api'
		/** The Codex plugin's route prefix on that bridge. */
		const CODEX_RPC_PREFIX = 'codex-subscription/'
		/** Steady-state refresh cadence; the Codex host caches usage for 60s. */
		const REFRESH_MS = 60000
		/** Fast retry while the bridge looks absent, so a slow boot is not a 60s gap. */
		const RETRY_MS = 5000
		/** Retries at RETRY_MS before settling on the steady cadence. */
		const RETRY_ATTEMPTS = 6
		/** A single bridge call must not hang the refresh loop. */
		const REQUEST_TIMEOUT_MS = 20000
		/** Remaining percent at or below this reads as a warning. */
		const LOW_REMAINING = 20

		//#region copy
		const COPY_EN = {
			cardName: 'Codex',
			cardTitle: 'Codex usage',
			signIn: 'Sign in',
			errorShort: 'Unavailable',
			exhausted: 'Exhausted',
			stale: 'Stale',
			resetCreditsCount: '{count} resets',
			remainingShort: '{value}%',
			remaining: '{value}% remaining',
			resetsAt: 'resets {time}',
			lowQuota: 'low',
			windowFiveHours: '5h',
			windowDaily: 'Daily',
			windowWeekly: 'Weekly',
			windowMonthly: 'Monthly',
			windowAnnual: 'Annual',
			windowDays: '{value}d',
			windowHours: '{value}h',
			dashboardTitle: 'Codex usage',
			dashboardSubtitle: 'ChatGPT subscription quota reported by the Codex plugin.',
			refresh: 'Refresh',
			refreshing: 'Refreshing…',
			close: 'Close',
			limits: 'Quota windows',
			chatPass: 'Chat pass',
			credits: 'Credits',
			balance: 'Balance',
			unlimited: 'Unlimited',
			unreported: '—',
			resetCredits: 'Reset credits',
			monthlyLimit: 'Spend limit',
			approxMessages: 'Approx. messages',
			approxLocal: 'local',
			approxCloud: 'cloud',
			expiresAt: 'expires {time}',
			updatedAt: 'Updated {time}',
			never: 'never',
			unavailable: 'The Codex plugin is not answering',
			unavailableHint:
				'This panel reads quota from the Codex plugin (dsh-codex-subscription). Install or enable that plugin, then reload.',
			signedOut: 'No ChatGPT account is connected',
			signedOutHint: 'Sign in from Settings → Codex. This panel only displays the quota that plugin reports.',
			errorTitle: 'Could not read quota',
			empty: 'This account reported no displayable quota windows. That does not mean zero quota.',
			spendReached: 'The account has reached its spend control limit.',
			sourceLine: 'Source: dsh-codex-subscription',
		}

		const COPY_ZH = {
			cardName: 'Codex',
			cardTitle: 'Codex 额度',
			signIn: '未登录',
			errorShort: '不可用',
			exhausted: '已用尽',
			stale: '数据陈旧',
			resetCreditsCount: '{count} 次重置',
			remainingShort: '{value}%',
			remaining: '剩余 {value}%',
			resetsAt: '{time} 重置',
			lowQuota: '偏低',
			windowFiveHours: '5 小时',
			windowDaily: '每日',
			windowWeekly: '每周',
			windowMonthly: '每月',
			windowAnnual: '每年',
			windowDays: '{value} 天',
			windowHours: '{value} 小时',
			dashboardTitle: 'Codex 额度',
			dashboardSubtitle: '由 Codex 插件上报的 ChatGPT 订阅额度。',
			refresh: '刷新',
			refreshing: '刷新中…',
			close: '关闭',
			limits: '额度窗口',
			chatPass: 'Chat pass',
			credits: '额度点数',
			balance: '余额',
			unlimited: '不限',
			unreported: '—',
			resetCredits: '重置次数',
			monthlyLimit: '消费上限',
			approxMessages: '可用消息数',
			approxLocal: '本地',
			approxCloud: '云端',
			expiresAt: '{time} 到期',
			updatedAt: '更新于 {time}',
			never: '从未',
			unavailable: 'Codex 插件未响应',
			unavailableHint: '本面板从 Codex 插件（dsh-codex-subscription）读取额度。请安装或启用该插件后刷新。',
			signedOut: '尚未连接 ChatGPT 账号',
			signedOutHint: '请到 设置 → Codex 登录。本面板只展示该插件上报的额度。',
			errorTitle: '无法读取额度',
			empty: '该账号没有可显示的额度窗口，但这并不代表额度为零。',
			spendReached: '该账号已达到消费上限。',
			sourceLine: '数据来源：dsh-codex-subscription',
		}
		//#endregion

		//#region helpers
		function isRecord(value) {
			return value !== null && typeof value === 'object' && !Array.isArray(value)
		}

		function clampPercent(value) {
			const numeric = Number(value)
			if (!Number.isFinite(numeric)) return 0
			return Math.min(100, Math.max(0, numeric))
		}

		/** Up to one decimal; quota percentages are integers in practice. */
		function percentText(value) {
			const numeric = Number(value)
			if (!Number.isFinite(numeric)) return '—'
			try {
				return numeric.toLocaleString(undefined, { maximumFractionDigits: 1 })
			} catch {
				return String(Math.round(numeric * 10) / 10)
			}
		}

		/** A decimal string from the endpoint (`"12.50"`), or '' when absent. */
		function decimalText(value) {
			if (typeof value === 'number' && Number.isFinite(value)) {
				try {
					return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
				} catch {
					return String(value)
				}
			}
			if (typeof value !== 'string' || value === '') return ''
			const numeric = Number(value)
			if (!Number.isFinite(numeric)) return value
			try {
				return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
			} catch {
				return value
			}
		}

		/** Local clock time; adds the weekday once the reset is not today. */
		function formatClock(ms, now) {
			if (!Number.isFinite(ms) || ms <= 0) return ''
			const date = new Date(ms)
			if (!Number.isFinite(date.getTime())) return ''
			const sameDay = date.toDateString() === new Date(now).toDateString()
			try {
				return sameDay
					? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
					: date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
			} catch {
				return date.toLocaleString()
			}
		}

		function formatStamp(ms) {
			if (!Number.isFinite(ms) || ms <= 0) return ''
			const date = new Date(ms)
			if (!Number.isFinite(date.getTime())) return ''
			try {
				return date.toLocaleString()
			} catch {
				return date.toISOString()
			}
		}

		/** `1,200–5,000`; the endpoint reports approximate message counts as a pair. */
		function rangeText(pair) {
			if (!Array.isArray(pair) || pair.length !== 2) return ''
			const low = Number(pair[0])
			const high = Number(pair[1])
			if (!Number.isFinite(low) || !Number.isFinite(high)) return ''
			try {
				return low.toLocaleString() + '–' + high.toLocaleString()
			} catch {
				return String(low) + '–' + String(high)
			}
		}

		function approxWindow(seconds, expected) {
			return seconds >= expected * 0.95 && seconds <= expected * 1.05
		}

		function windowLabel(seconds, t) {
			if (approxWindow(seconds, 18000)) return t('windowFiveHours')
			if (approxWindow(seconds, 86400)) return t('windowDaily')
			if (approxWindow(seconds, 604800)) return t('windowWeekly')
			if (approxWindow(seconds, 2592000)) return t('windowMonthly')
			if (approxWindow(seconds, 31536000)) return t('windowAnnual')
			if (seconds >= 86400 && seconds % 86400 === 0) return t('windowDays', { value: seconds / 86400 })
			return t('windowHours', { value: Math.round(seconds / 3600) })
		}

		function isDisplayableWindow(window) {
			return (
				isRecord(window) &&
				Number.isFinite(window.remainingPercent) &&
				Number.isFinite(window.windowSeconds) &&
				window.windowSeconds > 0
			)
		}

		function limitsOf(usage) {
			if (!isRecord(usage) || !Array.isArray(usage.rateLimits)) return []
			return usage.rateLimits.filter(isRecord)
		}

		/** A limit's windows, shortest first, so 5h reads above the weekly row. */
		function windowsOf(limit) {
			if (!isRecord(limit) || !Array.isArray(limit.windows)) return []
			return limit.windows
				.filter(isDisplayableWindow)
				.slice()
				.sort(function (left, right) {
					return left.windowSeconds - right.windowSeconds
				})
		}

		/** The Codex limit when present, else the first limit that has windows. */
		function primaryLimit(usage) {
			const limits = limitsOf(usage)
			const codex = limits.find(function (limit) {
				return limit.id === 'codex' && windowsOf(limit).length > 0
			})
			if (codex !== undefined) return codex
			return limits.find(function (limit) {
				return windowsOf(limit).length > 0
			})
		}

		function rowOf(window, t, now) {
			const remaining = clampPercent(window.remainingPercent)
			/**
			 * `resetsAt` is epoch SECONDS (the Codex projection converts the
			 * endpoint's `reset_at` with `epochSeconds`, and its own readout
			 * multiplies by 1000); credit expiries, by contrast, arrive in ms.
			 */
			const resetAtMs = Number.isFinite(window.resetsAt) ? window.resetsAt * 1000 : 0
			return {
				key: String(window.windowSeconds),
				label: windowLabel(window.windowSeconds, t),
				percentText: t('remainingShort', { value: percentText(remaining) }),
				resetText: resetAtMs > 0 ? t('resetsAt', { time: formatClock(resetAtMs, now) }) : '',
				bar: remaining,
				warn: remaining <= LOW_REMAINING,
			}
		}

		function windowView(window, t, now) {
			const row = rowOf(window, t, now)
			row.key = String(window.windowSeconds)
			return row
		}

		function messageOf(result, fallback) {
			if (isRecord(result) && isRecord(result.error)) {
				const message = result.error.message
				if (typeof message === 'string' && message !== '') return message
			}
			return fallback
		}

		/** Install one stylesheet by id and return the disposer for its owning effect. */
		function injectCss(id, css) {
			if (typeof document === 'undefined') return function () {}
			if (document.querySelector('style[data-plugin-css="' + id + '"]') !== null) return function () {}
			const tag = document.createElement('style')
			tag.dataset.plugin = PACKAGE_NAME
			tag.dataset.pluginCss = id
			tag.textContent = css
			document.head.appendChild(tag)
			return function () {
				tag.remove()
			}
		}
		//#endregion

		//#region store
		function createStore(initial) {
			let snapshot = initial
			const listeners = new Set()
			return {
				getSnapshot: function () {
					return snapshot
				},
				subscribe: function (listener) {
					listeners.add(listener)
					return function () {
						listeners.delete(listener)
					}
				},
				set: function (next) {
					if (Object.is(next, snapshot)) return
					snapshot = next
					listeners.forEach(function (listener) {
						try {
							listener()
						} catch (error) {
							console.error('[' + PACKAGE_NAME + '] subscriber failed:', error)
						}
					})
				},
			}
		}

		const INITIAL_STATE = {
			/** `loading` | `ready` | `signed-out` | `error` | `unavailable` */
			phase: 'loading',
			usage: undefined,
			status: undefined,
			error: '',
			/** When the displayed usage was fetched (panel clock, not the endpoint's). */
			updatedAt: 0,
			fetching: false,
		}

		/**
		 * Quota reader over the Codex plugin's bridge.
		 *
		 * `status` is asked first, exactly as the Codex composer readout does: an
		 * unauthenticated account must not turn into a usage error, and a missing
		 * route must not turn into "signed out". A throw therefore means the
		 * bridge or its plugin is absent, while a `{ok:false}` answer means the
		 * plugin is present and reporting a real failure.
		 */
		function createUsageController(options) {
			const store = options.store
			const getRpc = options.getRpc
			const isDisposed = options.isDisposed
			let inFlight
			let stopped = false

			function unavailableError() {
				const error = new Error('the Codex plugin bridge is unavailable')
				error.codexUnavailable = true
				return error
			}

			async function call(endpoint, payload) {
				const rpc = getRpc()
				if (rpc === undefined || rpc === null || typeof rpc.call !== 'function') throw unavailableError()
				const controller = new AbortController()
				const timer = setTimeout(function () {
					controller.abort()
				}, REQUEST_TIMEOUT_MS)
				try {
					return await rpc.call(RPC_CHANNEL, CODEX_RPC_PREFIX + endpoint, payload, controller.signal)
				} finally {
					clearTimeout(timer)
				}
			}

			async function run(force) {
				const before = store.getSnapshot()
				store.set(Object.assign({}, before, { fetching: true }))
				let next
				try {
					const statusResult = await call('status', {})
					if (isDisposed()) return
					if (!isRecord(statusResult) || statusResult.ok !== true) {
						next = {
							phase: 'error',
							usage: before.usage,
							status: undefined,
							error: messageOf(statusResult, 'the Codex plugin rejected the account request'),
							updatedAt: before.updatedAt,
							fetching: false,
						}
					} else {
						const status = isRecord(statusResult.value) ? statusResult.value : {}
						if (status.authenticated !== true) {
							next = {
								phase: 'signed-out',
								usage: undefined,
								status: status,
								error: '',
								updatedAt: Date.now(),
								fetching: false,
							}
						} else {
							const usageResult = await call('usage', { force: force === true })
							if (isDisposed()) return
							if (isRecord(usageResult) && usageResult.ok === true && isRecord(usageResult.value)) {
								next = {
									phase: 'ready',
									usage: usageResult.value,
									status: status,
									error: '',
									updatedAt: Date.now(),
									fetching: false,
								}
							} else {
								const message = messageOf(usageResult, 'the Codex plugin could not report usage')
								const signedOut = /sign[ -]?in|signed in|not authenticated/i.test(message)
								next = {
									phase: signedOut ? 'signed-out' : 'error',
									usage: signedOut ? undefined : before.usage,
									status: status,
									error: signedOut ? '' : message,
									updatedAt: before.updatedAt,
									fetching: false,
								}
							}
						}
					}
				} catch (error) {
					if (isDisposed()) return
					const message = error && error.message ? String(error.message) : 'the Codex plugin bridge is unavailable'
					next =
						before.usage !== undefined
							? Object.assign({}, before, { phase: 'ready', error: message, fetching: false })
							: {
									phase: before.phase === 'signed-out' ? 'signed-out' : 'unavailable',
									usage: undefined,
									status: before.status,
									error: message,
									updatedAt: before.updatedAt,
									fetching: false,
								}
				}
				if (next !== undefined && !isDisposed()) store.set(next)
			}

			function refresh(force) {
				if (inFlight !== undefined) return inFlight
				const pending = run(force).finally(function () {
					inFlight = undefined
				})
				inFlight = pending
				return pending
			}

			/**
			 * Poll until disposed: immediately, then fast while the bridge looks
			 * absent, then at the steady cadence. A hidden tab makes no requests and
			 * refreshing on return to the foreground keeps a parked panel current.
			 */
			function start() {
				if (typeof window === 'undefined') return function () {}
				let timer
				let attempts = 0
				const settle = function () {
					if (stopped) return
					const phase = store.getSnapshot().phase
					if (phase === 'unavailable' && attempts < RETRY_ATTEMPTS) {
						attempts += 1
						timer = window.setTimeout(step, RETRY_MS)
						return
					}
					attempts = 0
					timer = window.setTimeout(step, REFRESH_MS)
				}
				const step = function () {
					if (stopped) return
					if (document.visibilityState === 'hidden') {
						timer = window.setTimeout(step, REFRESH_MS)
						return
					}
					const pending = refresh(false)
					if (pending !== undefined && typeof pending.then === 'function') {
						pending.then(settle, settle)
					} else {
						settle()
					}
				}
				const onVisibilityChange = function () {
					if (document.visibilityState !== 'visible' || stopped) return
					window.clearTimeout(timer)
					attempts = 0
					step()
				}
				step()
				document.addEventListener('visibilitychange', onVisibilityChange)
				return function () {
					stopped = true
					window.clearTimeout(timer)
					document.removeEventListener('visibilitychange', onVisibilityChange)
				}
			}

			return { refresh: refresh, start: start }
		}
		//#endregion

		//#region views
		/** The card's whole face, derived from the store snapshot. */
		function buildCard(state, t, now) {
			const limit = primaryLimit(state.usage)
			const windows = limit === undefined ? [] : windowsOf(limit).slice(0, 2)
			const rows = windows.map(function (window) {
				return rowOf(window, t, now)
			})
			const headline = rows.length > 0 ? rows[0] : undefined
			const exhausted = windows.some(function (window) {
				return Number(window.remainingPercent) <= 0
			})
			let badge = ''
			let tone = 'muted'
			if (state.phase === 'signed-out') {
				badge = t('signIn')
			} else if (state.phase === 'error') {
				badge = t('errorShort')
				tone = 'warn'
			} else if (exhausted) {
				badge = t('exhausted')
				tone = 'warn'
			} else if (state.error !== '') {
				badge = t('stale')
			} else if (isRecord(state.usage) && isRecord(state.usage.resetCredits)) {
				const count = state.usage.resetCredits.availableCount
				if (Number.isFinite(count) && count > 0) badge = t('resetCreditsCount', { count: count })
			}
			const summary = rows
				.map(function (row) {
					return row.label + ' ' + row.percentText
				})
				.join(' · ')
			return {
				phase: state.phase,
				rows: rows,
				ringPercent: headline === undefined ? 0 : headline.bar,
				ringWarn: state.phase === 'error' || (headline !== undefined && headline.warn),
				badge: badge,
				tone: tone,
				title: summary === '' ? t('cardTitle') : t('cardTitle') + ' · ' + summary,
			}
		}

		/** The dashboard's face: quota blocks, credit tiles and notices. */
		function buildDashboard(state, t, now) {
			const usage = state.usage
			const blocks = limitsOf(usage)
				.map(function (limit) {
					return {
						key: String(limit.id || 'limit'),
						name: typeof limit.name === 'string' && limit.name !== '' ? limit.name : '',
						windows: windowsOf(limit).map(function (window) {
							return windowView(window, t, now)
						}),
					}
				})
				.filter(function (block) {
					return block.windows.length > 0
				})

			if (isRecord(usage) && isRecord(usage.chatPass)) {
				const windows = Array.isArray(usage.chatPass.windows)
					? usage.chatPass.windows.filter(isDisplayableWindow).slice().sort(function (left, right) {
							return left.windowSeconds - right.windowSeconds
						})
					: []
				if (windows.length > 0) {
					blocks.push({
						key: 'chatpass',
						name: t('chatPass'),
						windows: windows.map(function (window) {
							return windowView(window, t, now)
						}),
					})
				}
			}

			const tiles = []
			if (isRecord(usage)) {
				if (isRecord(usage.credits)) {
					const credits = usage.credits
					tiles.push({
						key: 'balance',
						label: t('balance'),
						value:
							credits.unlimited === true ? t('unlimited') : decimalText(credits.balance) || t('unreported'),
						sub:
							Number.isFinite(credits.expiresAt) && credits.expiresAt > 0
								? t('expiresAt', { time: formatClock(credits.expiresAt, now) })
								: '',
					})
					const local = Array.isArray(credits.approxLocalMessages) ? credits.approxLocalMessages : undefined
					const cloud = Array.isArray(credits.approxCloudMessages) ? credits.approxCloudMessages : undefined
					if (local !== undefined || cloud !== undefined) {
						const sub = []
						if (local !== undefined) sub.push(t('approxLocal') + ' ' + rangeText(local))
						if (cloud !== undefined) sub.push(t('approxCloud') + ' ' + rangeText(cloud))
						tiles.push({
							key: 'messages',
							label: t('approxMessages'),
							value: local !== undefined ? rangeText(local) : rangeText(cloud),
							sub: sub.join(' · '),
						})
					}
				}
				if (isRecord(usage.individualLimit)) {
					const limit = usage.individualLimit
					tiles.push({
						key: 'spend',
						label: t('monthlyLimit'),
						value: t('remaining', { value: percentText(limit.remainingPercent) }),
						sub:
							(decimalText(limit.used) || t('unreported')) +
							' / ' +
							(decimalText(limit.limit) || t('unreported')),
					})
				}
				if (isRecord(usage.resetCredits)) {
					const resets = usage.resetCredits
					tiles.push({
						key: 'resets',
						label: t('resetCredits'),
						value: Number.isFinite(resets.availableCount) ? String(resets.availableCount) : t('unreported'),
						sub:
							Number.isFinite(resets.nextExpiresAt) && resets.nextExpiresAt > 0
								? t('expiresAt', { time: formatClock(resets.nextExpiresAt, now) })
								: '',
					})
				}
			}

			const notices = []
			if (state.phase === 'unavailable') {
				notices.push({ key: 'unavailable', tone: 'error', title: t('unavailable'), hint: t('unavailableHint'), detail: state.error })
			} else if (state.phase === 'signed-out') {
				notices.push({ key: 'signed-out', tone: 'info', title: t('signedOut'), hint: t('signedOutHint'), detail: '' })
			} else if (state.error !== '') {
				notices.push({ key: 'error', tone: 'error', title: t('errorTitle'), hint: '', detail: state.error })
			}
			if (isRecord(usage) && usage.spendControlReached === true) {
				notices.push({ key: 'spend', tone: 'error', title: t('spendReached'), hint: '', detail: '' })
			}
			if (blocks.length === 0 && state.phase === 'ready') {
				notices.push({ key: 'empty', tone: 'info', title: t('empty'), hint: '', detail: '' })
			}

			return {
				phase: state.phase,
				blocks: blocks,
				tiles: tiles,
				notices: notices,
				freshness:
					state.updatedAt > 0 ? t('updatedAt', { time: formatStamp(state.updatedAt) }) : t('never'),
			}
		}
		//#endregion

		//#region components
		/**
		 * The store's selector for `useUsage`. It must be a FUNCTION and a stable
		 * reference: the renderer binds `hooks` sources through
		 * `useSyncExternalStoreWithSelector`, whose selector parameter has no
		 * identity default (it is invoked unconditionally) and whose identity is a
		 * `useMemo` dependency. Passing no selector at all throws on first render.
		 */
		const selectUsage = function (state) {
			return state
		}

		/**
		 * The quota ring. One glyph serves the rail button, the card's top row and
		 * the dashboard: a faint track plus an arc whose sweep is the RESTING
		 * quota, drawn from 12 o'clock. Circumference 2πr = 45.55 at r = 7.25.
		 *
		 * It reads remaining rather than consumed on purpose: the Codex plugin's
		 * own readings are all "remaining", and a bar that empties as quota is
		 * spent is what its settings page already shows.
		 */
		function Ring(props) {
			const percent = clampPercent(props.percent)
			const circumference = 45.55
			const dashoffset = Math.round(circumference * (1 - percent / 100) * 1000) / 1000
			const stroke = props.warn ? 'var(--dsw-alias-state-error-primary)' : 'currentColor'
			return h(
				'span',
				{ className: 'cup-glyph', 'aria-hidden': 'true' },
				h(
					'svg',
					{ viewBox: '0 0 20 20', width: props.size, height: props.size, focusable: 'false' },
					h('circle', {
						cx: '10',
						cy: '10',
						r: '7.25',
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: '1.5',
						opacity: '0.4',
					}),
					h('circle', {
						cx: '10',
						cy: '10',
						r: '7.25',
						fill: 'none',
						stroke: stroke,
						strokeWidth: '2.5',
						strokeLinecap: 'round',
						strokeDasharray: String(circumference),
						strokeDashoffset: String(dashoffset),
						transform: 'rotate(-90 10 10)',
					}),
				),
			)
		}

		/**
		 * The sidebar footer card, registered into `sidebar.footer.action`.
		 *
		 * The shell renders this list in the foot area directly above the Settings
		 * entry and supplies no chrome, so this component owns its whole surface:
		 * the button, its chrome and its accessible name. A missing Codex bridge
		 * renders nothing — see the module doc.
		 */
		function CodexFooterCard(props) {
			const state = props.useUsage(selectUsage)
			const t = props.t
			const wide = props.wide !== false
			if (state.phase === 'unavailable') return null
			const view = buildCard(state, t, Date.now())
			if (!wide) {
				return h(
					'button',
					{
						type: 'button',
						className: 'cup-railButton',
						'aria-label': view.title,
						title: view.title,
						onClick: props.open,
					},
					h(Ring, { percent: view.ringPercent, warn: view.ringWarn, size: 18 }),
				)
			}
			const children = [
				h(
					'span',
					{ className: 'cup-footTop', key: 'top' },
					h(Ring, { percent: view.ringPercent, warn: view.ringWarn, size: 16 }),
					h('span', { className: 'cup-footName', key: 'name' }, t('cardName')),
					h('span', { className: 'cup-spacer', key: 'spacer' }),
					view.badge === ''
						? null
						: h(
								'span',
								{ className: view.tone === 'warn' ? 'cup-badgeWarn' : 'cup-badgeMuted', key: 'badge' },
								view.badge,
							),
				),
			]
			view.rows.forEach(function (row) {
				children.push(
					h(
						'span',
						{ className: 'cup-footRow', key: 'row-' + row.key },
						h(
							'span',
							{ className: 'cup-footHead', key: 'head' },
							h('span', { className: 'cup-footLabel', key: 'label' }, row.label),
							h('span', { className: 'cup-spacer', key: 'spacer' }),
							row.resetText === ''
								? null
								: h('span', { className: 'cup-footAmount', key: 'amount' }, row.resetText),
							h('span', { className: 'cup-footPct', key: 'pct' }, row.percentText),
						),
						h(
							'span',
							{ className: 'cup-footBar', key: 'bar' },
							h('span', {
								className: row.warn ? 'cup-footFill cup-footFillWarn' : 'cup-footFill',
								style: { width: row.bar + '%' },
							}),
						),
					),
				)
			})
			return h(
				'button',
				{
					type: 'button',
					className: 'cup-foot',
					'aria-label': view.title,
					title: view.title,
					onClick: props.open,
				},
				children,
			)
		}

		/** One quota window: label, reset time, remaining percentage, then its bar. */
		function QuotaBar(props) {
			const window = props.window
			return h(
				'div',
				{ className: 'cup-window' },
				h(
					'div',
					{ className: 'cup-windowHead' },
					h('span', { className: 'cup-windowLabel' }, window.label),
					window.warn ? h('span', { className: 'cup-warnTag' }, props.lowLabel) : null,
					h('span', { className: 'cup-spacer' }),
					window.resetText === '' ? null : h('span', { className: 'cup-windowValue' }, window.resetText),
					h('span', { className: 'cup-windowPct' }, window.percentText),
				),
				h(
					'div',
					{ className: 'cup-bar' },
					h('div', {
						className: window.warn ? 'cup-barFill cup-barFillWarn' : 'cup-barFill',
						style: { width: window.bar + '%' },
					}),
				),
			)
		}

		/** The dashboard the card opens, registered in the root `main` keyed slot. */
		function CodexUsagePanel(props) {
			const state = props.useUsage(selectUsage)
			const t = props.t
			const view = buildDashboard(state, t, Date.now())
			const sections = []
			sections.push(
				h(
					'div',
					{ className: 'cup-header', key: 'header' },
					h(
						'div',
						{ className: 'cup-headerText', key: 'text' },
						h('h1', { className: 'cup-title' }, t('dashboardTitle')),
						h('p', { className: 'cup-subtitle' }, t('dashboardSubtitle')),
					),
					h('span', { className: 'cup-spacer', key: 'spacer' }),
					h(
						'button',
						{
							type: 'button',
							className: 'cup-button',
							key: 'refresh',
							disabled: state.fetching === true,
							'aria-busy': state.fetching === true,
							onClick: function () {
								props.refresh(true)
							},
						},
						state.fetching === true ? t('refreshing') : t('refresh'),
					),
					h(
						'button',
						{
							type: 'button',
							className: 'cup-button cup-close',
							key: 'close',
							'aria-label': t('close'),
							title: t('close'),
							onClick: props.close,
						},
						'\u2715',
					),
				),
			)

			if (view.notices.length > 0) {
				sections.push(
					h(
						'div',
						{ className: 'cup-notices', key: 'notices', 'aria-live': 'polite' },
						view.notices.map(function (notice) {
							return h(
								'div',
								{
									className:
										notice.tone === 'error' ? 'cup-notice cup-noticeError' : 'cup-notice',
									key: notice.key,
									role: notice.tone === 'error' ? 'alert' : 'status',
								},
								h('p', { className: 'cup-noticeTitle' }, notice.title),
								notice.hint === '' ? null : h('p', { className: 'cup-noticeHint' }, notice.hint),
								notice.detail === '' ? null : h('p', { className: 'cup-noticeDetail' }, notice.detail),
							)
						}),
					),
				)
			}

			if (view.blocks.length > 0) {
				sections.push(
					h(
						'section',
						{ className: 'cup-card', key: 'limits' },
						h('h2', { className: 'cup-blockTitle' }, t('limits')),
						h(
							'div',
							{ className: 'cup-windows' },
							view.blocks.map(function (block) {
								return h(
									'div',
									{ className: 'cup-limit', key: block.key },
									block.name === '' ? null : h('p', { className: 'cup-limitName' }, block.name),
									block.windows.map(function (window) {
										return h(QuotaBar, {
											key: block.key + '-' + window.key,
											window: window,
											lowLabel: t('lowQuota'),
										})
									}),
								)
							}),
						),
					),
				)
			}

			if (view.tiles.length > 0) {
				sections.push(
					h(
						'section',
						{ className: 'cup-card', key: 'credits' },
						h('h2', { className: 'cup-blockTitle' }, t('credits')),
						h(
							'div',
							{ className: 'cup-tiles' },
							view.tiles.map(function (tile) {
								return h(
									'div',
									{ className: 'cup-tile', key: tile.key },
									h('span', { className: 'cup-tileLabel' }, tile.label),
									h('span', { className: 'cup-tileValue' }, tile.value),
									tile.sub === '' ? null : h('span', { className: 'cup-tileSub' }, tile.sub),
								)
							}),
						),
					),
				)
			}

			sections.push(
				h(
					'p',
					{ className: 'cup-meta', key: 'meta' },
					view.freshness + ' · ' + t('sourceLine'),
				),
			)

			return h('div', { className: 'cup-main' }, h('div', { className: 'cup-mainInner' }, sections))
		}
		//#endregion

		//#region styles
		const CSS = `
/* ------------------------------------------------- sidebar footer card */
/* The shell renders this list ABOVE the Settings seat, so the card is the
   sidebar's bottom-most content, and supplies no chrome: the entry IS the
   button. Deliberately quiet — a surface beside Settings should read as part of
   the column — with one hover step and a hairline border.

   The shell's container is a flex ROW whose occupants each declare a full-width
   line and shrink-proof flex, so as a row it would overflow the column. The
   first rule is that fix; the anchor is load-bearing ("footerActions" is also
   used by other host surfaces, "footArea" belongs to the sidebar alone), and
   the descendant combinator survives a wrapper element appearing between them. */
[class*="_footArea"] [class*="_footerActions"]{flex-direction:column}
.cup-foot{box-sizing:border-box;flex:0 0 auto;width:100%;min-width:0;font:inherit;color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer;background:0 0;border:1px solid transparent;border-radius:10px;flex-direction:column;gap:6px;margin:0 0 4px;padding:8px;display:flex}
.cup-foot:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.cup-foot:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.cup-footTop{align-items:center;gap:8px;min-width:0;display:flex}
.cup-footName{white-space:nowrap;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);min-width:0;overflow:hidden;font-size:13px;font-weight:500;line-height:20px}
/* One block per quota window: a head line carrying the reset time and the
   remaining share, then the FULL-WIDTH bar under it. Stacking the two lets the
   card state when the window resets without squeezing the bar beside it. */
.cup-footRow{flex-direction:column;gap:4px;min-width:0;display:flex}
.cup-footHead{align-items:baseline;gap:8px;min-width:0;display:flex}
.cup-footLabel{flex:1;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}
.cup-footAmount{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
/* The card's markup must stay PHRASING content — the footer list may sit inside
   the shell's own control — so these bars are spans, which makes display:block
   load-bearing: an inline box ignores width outright, so the fill would
   collapse to 0x0 and the bar would show no quota at all. */
.cup-footBar{display:block;background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:5px;overflow:hidden}
.cup-footFill{display:block;background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.cup-footFillWarn{background:var(--dsw-alias-state-error-primary)}
.cup-footPct{flex:none;width:38px;color:var(--dsw-alias-label-secondary);text-align:right;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.cup-spacer{flex:1}
.cup-badgeMuted,.cup-badgeWarn{flex:none;white-space:nowrap;border-radius:999px;padding:0 8px;font-size:12px;font-weight:500;line-height:17px}
.cup-badgeMuted{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2)}
.cup-badgeWarn{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2)}

/* The 56px rail: one icon button on the shell's own 36px rail cell, so the
   collapsed column keeps a single 18px glyph like its siblings. */
.cup-railButton{box-sizing:border-box;width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:1px solid transparent;border-radius:8px;flex:none;justify-content:center;align-items:center;margin:0 0 4px;padding:0;display:inline-flex}
.cup-railButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.cup-railButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.cup-glyph{flex:none;justify-content:center;align-items:center;display:inline-flex;color:var(--dsw-alias-brand-primary)}

/* ------------------------------------------------------------ dashboard */
.cup-main{background:var(--dsw-alias-bg-base);width:100%;height:100%;overflow:auto;display:block;color:var(--dsw-alias-label-primary)}
.cup-mainInner{max-width:760px;margin:0 auto;padding:24px 20px 40px;flex-direction:column;gap:14px;display:flex}
.cup-header{align-items:center;gap:10px;display:flex;flex-wrap:wrap}
.cup-headerText{flex-direction:column;gap:2px;display:flex;min-width:0}
.cup-title{margin:0;font-size:18px;font-weight:600;line-height:1.4}
.cup-subtitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.cup-meta{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums}
.cup-button{font:inherit;font-size:12px;line-height:20px;color:var(--dsw-alias-label-primary);cursor:pointer;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:2px 10px}
.cup-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}
.cup-button:disabled{opacity:.6;cursor:default}
.cup-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.cup-close{min-width:28px;justify-content:center;padding-left:0;padding-right:0}

.cup-notices{flex-direction:column;gap:8px;display:flex}
.cup-notice{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:12px 14px;flex-direction:column;gap:4px;display:flex}
.cup-noticeError{border-color:var(--dsw-alias-state-error-primary)}
.cup-noticeTitle{margin:0;font-size:13px;font-weight:600;line-height:1.5}
.cup-noticeError .cup-noticeTitle{color:var(--dsw-alias-state-error-primary)}
.cup-noticeHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55}
.cup-noticeDetail{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;word-break:break-word}

.cup-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:14px;padding:16px 18px;flex-direction:column;gap:16px;display:flex}
.cup-blockTitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:600;line-height:1.5;text-transform:uppercase;letter-spacing:.04em}
.cup-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.cup-tile{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:8px 10px;flex-direction:column;gap:2px;display:flex;min-width:0}
.cup-tileLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.cup-tileValue{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4;font-variant-numeric:tabular-nums}
.cup-tileSub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.cup-windows{flex-direction:column;gap:14px;display:flex}
.cup-limit{flex-direction:column;gap:10px;display:flex}
.cup-limitName{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:1.5}
.cup-window{flex-direction:column;gap:6px;display:flex}
.cup-windowHead{align-items:baseline;gap:8px;display:flex}
.cup-windowLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:1.5}
.cup-windowValue{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums;white-space:nowrap}
.cup-windowPct{color:var(--dsw-alias-label-primary);min-width:44px;text-align:right;font-size:12px;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}
.cup-warnTag{white-space:nowrap;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);border-radius:999px;padding:0 8px;font-size:12px;font-weight:600;line-height:17px}
.cup-bar{overflow:hidden;background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:8px}
.cup-barFill{background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.cup-barFillWarn{background:var(--dsw-alias-state-error-primary)}
@media (prefers-reduced-motion:reduce){.cup-footFill,.cup-barFill{transition:none}}
`
		//#endregion

		//#region plugin
		/**
		 * Hard seats only. `layout` is taken through `ctx.inject` because a
		 * composition without the layout service must still render the dashboard;
		 * it only loses the card's open action.
		 */
		const inject = ['slots', 'locale', 'connection']

		function apply(ctx) {
			const store = createStore(INITIAL_STATE)
			let disposed = false
			const controller = createUsageController({
				store: store,
				isDisposed: function () {
					return disposed
				},
				getRpc: function () {
					const connection = ctx.get('connection')
					return connection === undefined || connection === null ? undefined : connection.rpc
				},
			})

			const refresh = function (force) {
				const pending = controller.refresh(force)
				if (pending !== undefined && typeof pending.catch === 'function') {
					pending.catch(function (error) {
						console.error('[' + PACKAGE_NAME + '] refresh failed:', error)
					})
				}
				return pending
			}

			const selectPanel = function (panelId) {
				const layout = ctx.get('layout')
				if (layout === undefined || layout === null || typeof layout.selectPanel !== 'function') {
					console.error('[' + PACKAGE_NAME + '] the layout service is unavailable; cannot change the main panel')
					return
				}
				try {
					layout.selectPanel(panelId)
				} catch (error) {
					console.error('[' + PACKAGE_NAME + '] could not change the main panel:', error)
				}
			}

			ctx.effect(function () {
				return ctx.locale.register(LOCALE_NS, { en: COPY_EN, zh: COPY_ZH })
			}, PACKAGE_NAME + ': copy')
			ctx.effect(function () {
				return injectCss(CSS_ID, CSS)
			}, PACKAGE_NAME + ': styles')
			ctx.effect(function () {
				const stop = controller.start()
				return function () {
					disposed = true
					stop()
				}
			}, PACKAGE_NAME + ': quota refresh')

			const t = ctx.locale.bind(LOCALE_NS)
			const face = function () {
				return {
					hooks: { usage: store },
					t: t,
					open: function () {
						selectPanel(PANEL_ID)
					},
					close: function () {
						selectPanel(null)
					},
					refresh: refresh,
				}
			}

			try {
				ctx.slots.inject('main', function () {
					return ctx.slots.register(
						{ name: 'main', key: PANEL_ID, locale: LOCALE_NS, inject: face },
						CodexUsagePanel,
					)
				})
			} catch (error) {
				console.error('[' + PACKAGE_NAME + '] could not register the quota dashboard:', error)
			}

			ctx.inject(['layout'], function (layoutCtx) {
				try {
					layoutCtx.slots.inject('sidebar.footer.action', function () {
						return layoutCtx.slots.register(
							{
								name: 'sidebar.footer.action',
								id: PANEL_ID,
								order: FOOTER_ORDER,
								label: function () {
									return t('cardName')
								},
								locale: LOCALE_NS,
								inject: face,
							},
							CodexFooterCard,
						)
					})
				} catch (error) {
					console.error('[' + PACKAGE_NAME + '] could not register the sidebar footer card:', error)
				}
			})
		}
		//#endregion

		return { inject: inject, apply: apply }
	},
})
