package com.yetimates.dandani;

import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DandaniMainActivity";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // WebView 디버깅 활성화 (개발용)
        WebView.setWebContentsDebuggingEnabled(true);
        Log.d(TAG, "WebView debugging enabled - Use chrome://inspect to debug");
    }
}
