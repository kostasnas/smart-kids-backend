package com.smartkids.app;

import android.os.Bundle ;
import com.getcapacitor.BridgeActivity;
import com.smartkids.app.PartialWebViewPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PartialWebViewPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
