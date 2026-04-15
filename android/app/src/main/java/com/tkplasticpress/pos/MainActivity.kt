package com.tkplasticpress.pos

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    
    // URL is set in android/local.properties as pos.url (never hardcoded here)
    // Change it there and rebuild whenever your Cloudflare tunnel URL rotates
    private val POS_URL = BuildConfig.POS_URL

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        swipeRefreshLayout = findViewById(R.id.swipeRefresh)

        setupWebView()

        // Set correct network availability BEFORE loading URL so navigator.onLine
        // is accurate on first render (avoids sync engine skipping initial syncAll)
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNet = cm.activeNetworkInfo
        webView.setNetworkAvailable(activeNet?.isConnectedOrConnecting == true)

        setupNetworkListener()

        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // Handle the back button to navigate within the webview if possible
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl(POS_URL)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        
        // Essential WebSettings for React + IndexedDB + Service Workers
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        
        // Performance optimizations
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.setSupportMultipleWindows(false)
        settings.mediaPlaybackRequiresUserGesture = false

        // Enable cookies
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // Force hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                    swipeRefreshLayout.isRefreshing = false
                } else {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                swipeRefreshLayout.isRefreshing = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                
                // Allow our specific domain and localhost
                if (url.startsWith(POS_URL) || url.startsWith("http://localhost") || url.startsWith("https://localhost")) {
                    return false
                }
                
                // If it's a completely external link, open in default browser
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    // Fallback
                    return false
                }
                return true
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // App Service Worker should ideally handle offline routing
                // If Service Worker is completely dead or first load fails without cache:
                // We could display a local fallback page here if necessary
            }
        }
    }

    private fun setupNetworkListener() {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                runOnUiThread {
                    webView.setNetworkAvailable(true)
                }
            }

            override fun onLost(network: Network) {
                runOnUiThread {
                    webView.setNetworkAvailable(false)
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }
}
