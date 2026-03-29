package com.smartkids.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "PartialWebView")
class PartialWebViewPlugin : Plugin() {

    private var webView: WebView? = null
    private var container: FrameLayout? = null
    private var saveBtn: TextView? = null
    private var progressBar: ProgressBar? = null
    private var centerLoader: ProgressBar? = null
    private var currentUrl: String = ""

    private val BAR_DP = 72

    private fun dp(v: Int) = (v * activity.resources.displayMetrics.density + 0.5f).toInt()

    private fun roundedBg(colorHex: String, radiusDp: Int = 14) =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(radiusDp).toFloat()
            setColor(Color.parseColor(colorHex))
        }

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    fun open(call: PluginCall) {
        val url       = call.getString("url") ?: run { call.reject("URL is required"); return }
        val isWishlist = call.getBoolean("isWishlist", false) ?: false
        val label     = call.getString("label", "") ?: ""
        val kidName   = call.getString("kidName", "") ?: ""

        activity.runOnUiThread {
            closeInternal()

            val root = activity.window.decorView
                .findViewById<ViewGroup>(android.R.id.content)

            // ── Outer container (full screen) ─────────────────────
            container = FrameLayout(activity).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                setBackgroundColor(Color.parseColor("#1a1a2e"))  // App theme color
            }

            // ── Center Loader (spinner) ─────────────────────
            centerLoader = ProgressBar(activity, null, android.R.attr.progressBarStyleLarge).apply {
                visibility = android.view.View.VISIBLE  // Show initially
                isIndeterminate = true
                layoutParams = FrameLayout.LayoutParams(
                    dp(60), dp(60)
                ).apply {
                    gravity = Gravity.CENTER
                }
            }
            container!!.addView(centerLoader)

            // ── Progress Bar (at very top) ─────────────────────
            progressBar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
                visibility = android.view.View.GONE
                max = 100
                progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#6200EE"))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    dp(3)
                ).apply {
                    gravity = Gravity.TOP
                }
            }
            container!!.addView(progressBar)

            val barPx = dp(BAR_DP)

            // ── WebView (full height minus bar) ───────────────────
            webView = WebView(activity).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ).apply { bottomMargin = barPx }

                settings.apply {
                    javaScriptEnabled  = true
                    domStorageEnabled  = true
                    loadWithOverviewMode = true
                    useWideViewPort    = true
                    setSupportZoom(true)
                    builtInZoomControls = true
                    displayZoomControls = false
                    userAgentString    = "Mozilla/5.0 (Linux; Android 12; Mobile) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/120.0.0.0 Mobile Safari/537.36"
                }

                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView, request: WebResourceRequest
                    ): Boolean {
                        val u = request.url.toString()
                        currentUrl = u
                        view.loadUrl(u)
                        notifyListeners("urlChanged", JSObject().apply { put("url", u) })
                        return true
                    }
                    override fun onPageFinished(view: WebView, url: String) {
                        currentUrl = url
                        notifyListeners("pageLoaded", JSObject().apply { put("url", url) })
                        notifyListeners("urlChanged", JSObject().apply { put("url", url) })
                    }
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onProgressChanged(view: WebView?, newProgress: Int) {
                        // Show/hide center loader based on progress
                        centerLoader?.visibility = if (newProgress < 30) android.view.View.VISIBLE else android.view.View.GONE
                        
                        // Show/hide top progress bar
                        progressBar?.visibility = if (newProgress > 5 && newProgress < 100) android.view.View.VISIBLE else android.view.View.GONE
                        progressBar?.progress = newProgress
                    }
                }

                loadUrl(url)
            }
            currentUrl = url
            container!!.addView(webView)

            // ── Native bottom bar ─────────────────────────────────
            val bar = LinearLayout(activity).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity     = Gravity.CENTER_VERTICAL
                setPadding(dp(12), 0, dp(12), 0)
                setBackgroundColor(Color.parseColor("#0f0f1a"))
                elevation = dp(8).toFloat()
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    barPx,
                    Gravity.BOTTOM
                )
            }

            // ‹ Back
            val backBtn = TextView(activity).apply {
                text     = "‹"
                textSize = 24f
                setTextColor(Color.WHITE)
                typeface = Typeface.DEFAULT_BOLD
                gravity  = Gravity.CENTER
                background = roundedBg("#1e1e3a")
                setPadding(dp(4), dp(4), dp(4), dp(4))
                setOnClickListener {
                    val wv = webView
                    if (wv != null && wv.canGoBack()) wv.goBack()
                }
            }
            bar.addView(backBtn, LinearLayout.LayoutParams(dp(44), dp(44)).apply {
                marginEnd = dp(10)
            })

            // Dot + status text
            val statusText = TextView(activity).apply {
                text      = "🔍  Βρες κάτι που σου αρέσει"
                textSize  = 11f
                setTextColor(Color.parseColor("#b0b8d0"))
                typeface  = Typeface.DEFAULT_BOLD
                gravity   = Gravity.CENTER_VERTICAL
            }
            bar.addView(statusText, LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
            ))

            // 💾 Save (only when not wishlist)
            if (!isWishlist) {
                saveBtn = TextView(activity).apply {
                    text      = "💾  Αποθήκευση"
                    textSize  = 12f
                    setTextColor(Color.WHITE)
                    typeface  = Typeface.DEFAULT_BOLD
                    gravity   = Gravity.CENTER
                    background = roundedBg("#7c3aed")
                    setPadding(dp(14), dp(4), dp(14), dp(4))
                    setOnClickListener {
                        val urlToSave = currentUrl.ifBlank { url }
                        // Notify React to save
                        notifyListeners("saveRequested", JSObject().apply {
                            put("url",     urlToSave)
                            put("label",   label)
                            put("kidName", kidName)
                        })
                        text       = "✅  Αποθηκεύτηκε!"
                        background = roundedBg("#059669")
                        postDelayed({
                            text       = "💾  Αποθήκευση"
                            background = roundedBg("#7c3aed")
                        }, 2000)
                    }
                }
                bar.addView(saveBtn, LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, dp(44)
                ).apply { marginStart = dp(8) })

                // 📤 Share (only when not wishlist)
                val shareBtn = TextView(activity).apply {
                    text      = "📤"
                    textSize  = 16f
                    setTextColor(Color.WHITE)
                    typeface  = Typeface.DEFAULT_BOLD
                    gravity   = Gravity.CENTER
                    background = roundedBg("#10b981")
                    setPadding(dp(8), dp(4), dp(8), dp(4))
                    setOnClickListener {
                        shareCurrentPage()
                    }
                }
                bar.addView(shareBtn, LinearLayout.LayoutParams(dp(44), dp(44)).apply {
                    marginStart = dp(4)
                })
            }

            // ✕ Close
            val closeBtn = TextView(activity).apply {
                text      = "✕"
                textSize  = 16f
                setTextColor(Color.WHITE)
                typeface  = Typeface.DEFAULT_BOLD
                gravity   = Gravity.CENTER
                background = roundedBg("#2a2a4a")
                setPadding(dp(4), dp(4), dp(4), dp(4))
                setOnClickListener { performClose() }
            }
            bar.addView(closeBtn, LinearLayout.LayoutParams(dp(44), dp(44)).apply {
                marginStart = dp(8)
            })

            container!!.addView(bar)
            root.addView(container)

            call.resolve()
        }
    }

    @PluginMethod
    fun close(call: PluginCall) {
        activity.runOnUiThread {
            performClose()
            call.resolve()
        }
    }

    @PluginMethod
    fun goBack(call: PluginCall) {
        activity.runOnUiThread {
            val wv    = webView
            val canGo = wv != null && wv.canGoBack()
            if (canGo) wv!!.goBack()
            call.resolve(JSObject().apply { put("canGoBack", canGo) })
        }
    }

    @PluginMethod
    override fun removeAllListeners(call: PluginCall) {
        call.resolve()
    }

    private fun performClose() {
        closeInternal()
        notifyListeners("browserClosed", JSObject())
    }

    private fun shareCurrentPage() {
        val url = webView?.url ?: return
        val title = webView?.title ?: "Product"
        
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, "$title\n$url")
            putExtra(Intent.EXTRA_SUBJECT, title)
        }
        
        activity.startActivity(Intent.createChooser(shareIntent, "Share Product"))
    }

    private fun closeInternal() {
        container?.let { c ->
            val root = activity.window.decorView
                .findViewById<ViewGroup>(android.R.id.content)
            root.removeView(c)
        }
        webView?.destroy()
        webView  = null
        saveBtn  = null
        progressBar = null
        centerLoader = null
        container = null
        currentUrl = ""
    }

    override fun handleOnDestroy() {
        activity.runOnUiThread { closeInternal() }
        super.handleOnDestroy()
    }
}
