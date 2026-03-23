#!/usr/bin/env node
/**
 * Postinstall script: patches node_modules for RN 0.74 (New Architecture) compatibility.
 *
 * Patches applied:
 *
 * 1. @rnmapbox/maps build.gradle — add missing lifecycle-runtime-ktx dependency
 * 2. @rnmapbox/maps RNMBXMapView.kt — remove ViewTreeLifecycleOwner import/call,
 *    change `override fun getLifecycle()` to Kotlin property override style
 * 3. react-native-screens CMakeLists.txt — remove targets not in RN 0.74 prefab
 *    (react_render_consistency, react_performance_timeline, react_render_observers_events)
 * 4. react-native-screens RNSScreenShadowNode.h/.cpp — fix getContentOriginOffset() bool param
 * 5. react-native-screens RNSModalScreenShadowNode.h/.cpp — same fix
 * 6. react-native-svg RNSVGConcreteShadowNode.h — fix 6-arg ConcreteShadowNode + override
 * 7. react-native-gesture-handler CMakeLists.txt — replace ReactAndroid::reactnative with
 *    individual RN 0.74 prefab targets; move find_package before add_library
 * 8. react-native-gesture-handler build.gradle — extend packagingOptions excludes to prevent
 *    duplicate .so conflicts at mergeDebugNativeLibs
 * 9. react-native-svg@15.11.0 — create missing scripts/rnsvg_utils.rb
 * 10. react-native-gesture-handler build.gradle — extend packagingOptions excludes
 * 11. react-native-mmkv createMMKV.js — remove nativeCallSyncHook check that false-triggers
 *     in Bridgeless/New Architecture mode (nativeCallSyncHook is a Bridge-only global)
 * 12. react-native-gesture-handler RNGestureHandlerRootView.kt + RNGestureHandlerRootHelper.kt
 *     — defer rootHelper init via post() AND use reactApplicationContext for getNativeModule
 *     to avoid CatalystInstance-not-set crash in Bridgeless mode (absent from 15.11.0
 *    npm package but referenced by RNSVG.podspec; backported from 15.12.0)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const NM = path.join(__dirname, '..', 'node_modules');

/**
 * Apply a set of string-replacement patches to a file.
 * Each patch has:
 *   marker      — a unique substring that is present in already-patched content (skip if found)
 *   old         — the exact string to replace (must be in original/unpatched content)
 *   replacement — the replacement string
 */
function patchFile(filePath, patches) {
  const label = path.relative(path.join(__dirname, '..'), filePath);
  if (!fs.existsSync(filePath)) {
    console.log('[postinstall] SKIP (not found): ' + label);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { marker, old: oldStr, replacement } of patches) {
    if (content.includes(marker)) {
      // already patched — skip this patch
      continue;
    }
    if (!content.includes(oldStr)) {
      console.warn('[postinstall] WARNING: Expected text not found in ' + label);
      console.warn('  Pattern: ' + JSON.stringify(oldStr.slice(0, 80)));
      continue;
    }
    content = content.replace(oldStr, replacement);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[postinstall] Patched: ' + label);
  } else {
    console.log('[postinstall] Already up-to-date: ' + label);
  }
}

// ---------------------------------------------------------------------------
// 1. @rnmapbox/maps — build.gradle: add lifecycle-runtime-ktx
// ---------------------------------------------------------------------------
patchFile(
  path.join(NM, '@rnmapbox/maps/android/build.gradle'),
  [
    {
      marker: 'lifecycle-runtime-ktx-patch-applied',
      old: "            implementation 'androidx.asynclayoutinflater:asynclayoutinflater:1.0.0'",
      replacement: [
        "            implementation 'androidx.asynclayoutinflater:asynclayoutinflater:1.0.0'",
        '            // PATCH(postinstall): lifecycle-runtime-ktx-patch-applied',
        '            // ViewTreeLifecycleOwner requires lifecycle-runtime-ktx at compile time.',
        "            implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'",
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 2. @rnmapbox/maps — RNMBXMapView.kt: remove ViewTreeLifecycleOwner, fix lifecycle
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    '@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/mapview/RNMBXMapView.kt',
  ),
  [
    {
      // Remove the ViewTreeLifecycleOwner import
      marker: 'PATCH: ViewTreeLifecycleOwner.set() replaced',
      old: 'import androidx.lifecycle.ViewTreeLifecycleOwner',
      replacement: [
        '// PATCH: ViewTreeLifecycleOwner.set() replaced with direct view tag to avoid',
        '// compile-time resolution issues with lifecycle-runtime on RN 0.74 builds.',
      ].join('\n'),
    },
    {
      // Remove the ViewTreeLifecycleOwner.set() call
      marker: 'PATCH: ViewTreeLifecycleOwner.set() removed',
      old: '                ViewTreeLifecycleOwner.set(view, lifecycleOwner)',
      replacement: [
        '                // PATCH: ViewTreeLifecycleOwner.set() removed — lifecycle events are dispatched',
        '                // manually via handleLifecycleEvent(); view-tree registration is not critical.',
      ].join('\n'),
    },
    {
      // Change override fun getLifecycle() to Kotlin property override style
      marker: 'override val lifecycle: Lifecycle',
      old: [
        '                override fun getLifecycle(): Lifecycle {',
        '                    return lifecycleRegistry',
        '                }',
      ].join('\n'),
      replacement: [
        '                override val lifecycle: Lifecycle',
        '                    get() = lifecycleRegistry',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 3. react-native-screens — CMakeLists.txt: remove missing RN 0.74 targets
// ---------------------------------------------------------------------------
patchFile(
  path.join(NM, 'react-native-screens/android/CMakeLists.txt'),
  [
    {
      marker: 'react_render_consistency, react_performance_timeline',
      old: [
        '                ReactAndroid::react_render_componentregistry',
        '                ReactAndroid::react_render_consistency',
        '                ReactAndroid::react_performance_timeline',
        '                ReactAndroid::react_render_observers_events',
        '                fbjni::fbjni',
      ].join('\n'),
      replacement: [
        '                ReactAndroid::react_render_componentregistry',
        '                # react_render_consistency, react_performance_timeline, react_render_observers_events',
        '                # do not exist in RN 0.74 prefab — removed for RN 0.74 compatibility',
        '                fbjni::fbjni',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 4. react-native-screens — RNSScreenShadowNode.h: fix getContentOriginOffset bool param
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-screens/common/cpp/react/renderer/components/rnscreens/RNSScreenShadowNode.h',
  ),
  [
    {
      marker: 'PATCH: RN 0.74 base class has getContentOriginOffset() without bool param.',
      old: '  Point getContentOriginOffset(bool includeTransform) const override;',
      replacement: [
        '  // PATCH: RN 0.74 base class has getContentOriginOffset() without bool param.',
        '  // Newer RN adds a bool param — removed here to avoid -Woverloaded-virtual error.',
        '  Point getContentOriginOffset() const override;',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 5. react-native-screens — RNSScreenShadowNode.cpp: fix getContentOriginOffset bool param
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-screens/common/cpp/react/renderer/components/rnscreens/RNSScreenShadowNode.cpp',
  ),
  [
    {
      marker: 'PATCH: Signature changed to match RN 0.74 base class',
      old: 'Point RNSScreenShadowNode::getContentOriginOffset(bool includeTransform) const {',
      replacement: [
        '// PATCH: Signature changed to match RN 0.74 base class (no bool param)',
        'Point RNSScreenShadowNode::getContentOriginOffset() const {',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 6. react-native-screens — RNSModalScreenShadowNode.h: fix getContentOriginOffset bool param
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-screens/common/cpp/react/renderer/components/rnscreens/RNSModalScreenShadowNode.h',
  ),
  [
    {
      marker: 'PATCH: RN 0.74 base class has getContentOriginOffset() without bool param.',
      old: '  Point getContentOriginOffset(bool includeTransform) const override;',
      replacement: [
        '  // PATCH: RN 0.74 base class has getContentOriginOffset() without bool param.',
        '  Point getContentOriginOffset() const override;',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 7. react-native-screens — RNSModalScreenShadowNode.cpp: fix getContentOriginOffset bool param
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-screens/common/cpp/react/renderer/components/rnscreens/RNSModalScreenShadowNode.cpp',
  ),
  [
    {
      marker: 'PATCH: Signature changed to match RN 0.74 base class',
      old: 'Point RNSModalScreenShadowNode::getContentOriginOffset(bool includeTransform) const {',
      replacement: [
        '// PATCH: Signature changed to match RN 0.74 base class (no bool param)',
        'Point RNSModalScreenShadowNode::getContentOriginOffset() const {',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 8. react-native-svg — RNSVGConcreteShadowNode.h: fix 6-arg template + overrides
//    Original from react-native-svg@15.11.0 npm package.
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-svg/common/cpp/react/renderer/components/rnsvg/RNSVGConcreteShadowNode.h',
  ),
  [
    {
      // Remove 6th template arg (false) in class declaration
      marker: 'PATCH: RN 0.74\'s ConcreteShadowNode takes 5 template args',
      old: [
        'class RNSVGConcreteShadowNode : public ConcreteShadowNode<',
        '                                    concreteComponentName,',
        '                                    RNSVGLayoutableShadowNode,',
        '                                    PropsT,',
        '                                    ViewEventEmitter,',
        '                                    StateData,',
        '                                    false> {',
      ].join('\n'),
      replacement: [
        '// PATCH: RN 0.74\'s ConcreteShadowNode takes 5 template args (no 6th bool).',
        '// The 6th arg was added in RN 0.75+. Reverted for RN 0.74 compatibility.',
        'class RNSVGConcreteShadowNode : public ConcreteShadowNode<',
        '                                    concreteComponentName,',
        '                                    RNSVGLayoutableShadowNode,',
        '                                    PropsT,',
        '                                    ViewEventEmitter,',
        '                                    StateData> {',
      ].join('\n'),
    },
    {
      // Remove 6th arg from BaseShadowNode typedef
      // Marker: look for the 5-arg version (already patched) OR the 6-arg original
      marker: 'StateData>;',
      old: [
        '  using BaseShadowNode = ConcreteShadowNode<',
        '      concreteComponentName,',
        '      RNSVGLayoutableShadowNode,',
        '      PropsT,',
        '      ViewEventEmitter,',
        '      StateData,',
        '      false>;',
      ].join('\n'),
      replacement: [
        '  using BaseShadowNode = ConcreteShadowNode<',
        '      concreteComponentName,',
        '      RNSVGLayoutableShadowNode,',
        '      PropsT,',
        '      ViewEventEmitter,',
        '      StateData>;',
      ].join('\n'),
    },
    {
      marker: 'PATCH: canBeTouchTarget/canChildrenBeTouchTarget are not virtual in RN 0.74',
      old: '  bool canBeTouchTarget() const override {',
      replacement: [
        '  // PATCH: canBeTouchTarget/canChildrenBeTouchTarget are not virtual in RN 0.74',
        '  // (added in RN 0.75+). Removed \'override\' to allow compilation.',
        '  bool canBeTouchTarget() const {',
      ].join('\n'),
    },
    {
      // canChildrenBeTouchTarget override is removed together with canBeTouchTarget above;
      // this patch handles the case where only canChildrenBeTouchTarget needs patching alone.
      marker: 'bool canChildrenBeTouchTarget() const {',
      old: '  bool canChildrenBeTouchTarget() const override {',
      replacement: '  bool canChildrenBeTouchTarget() const {',
    },
  ],
);

// ---------------------------------------------------------------------------
// 9. react-native-gesture-handler — CMakeLists.txt:
//    - Move find_package before add_library (CMake needs IMPORTED targets resolved first)
//    - Replace ReactAndroid::reactnative (RN 0.75+) with individual RN 0.74 prefab targets
// ---------------------------------------------------------------------------
// NOTE: We cannot use template literals (${...}) inside multi-line cmake strings in JS,
// so we build the replacement using string concatenation.
const ghCMakeOld = [
  'set(PACKAGE_NAME "gesturehandler")',
  'set(REACT_ANDROID_DIR "${REACT_NATIVE_DIR}/ReactAndroid")',
  '',
  'include(${REACT_ANDROID_DIR}/cmake-utils/folly-flags.cmake)',
  'add_compile_options(${folly_FLAGS})',
  '',
  'add_library(${PACKAGE_NAME}',
  '  SHARED',
  '  cpp-adapter.cpp',
  ')',
  '',
  'target_include_directories(',
  '  ${PACKAGE_NAME}',
  '  PRIVATE',
  '  "${REACT_NATIVE_DIR}/ReactCommon"',
  ')',
  '',
  'find_package(ReactAndroid REQUIRED CONFIG)',
  'find_package(fbjni REQUIRED CONFIG)',
  '',
  'target_link_libraries(',
  '  ${PACKAGE_NAME}',
  '  ReactAndroid::reactnative',
  '  ReactAndroid::jsi',
  '  fbjni::fbjni',
  ')',
].join('\n');

const ghCMakeReplacement = [
  'set(PACKAGE_NAME "gesturehandler")',
  'set(REACT_ANDROID_DIR "${REACT_NATIVE_DIR}/ReactAndroid")',
  '',
  'include(${REACT_ANDROID_DIR}/cmake-utils/folly-flags.cmake)',
  'add_compile_options(${folly_FLAGS})',
  '',
  '# PATCH: find_package must be called before add_library so CMake can resolve IMPORTED targets',
  'find_package(ReactAndroid REQUIRED CONFIG)',
  'find_package(fbjni REQUIRED CONFIG)',
  '',
  'add_library(${PACKAGE_NAME}',
  '  SHARED',
  '  cpp-adapter.cpp',
  ')',
  '',
  'target_include_directories(',
  '  ${PACKAGE_NAME}',
  '  PRIVATE',
  '  "${REACT_NATIVE_DIR}/ReactCommon"',
  ')',
  '',
  'target_link_libraries(',
  '  ${PACKAGE_NAME}',
  '  # ReactAndroid::reactnative does not exist in RN 0.74; use individual prefab targets',
  '  ReactAndroid::reactnativejni',
  '  ReactAndroid::jsi',
  '  ReactAndroid::folly_runtime',
  '  ReactAndroid::react_debug',
  '  ReactAndroid::react_render_core',
  '  ReactAndroid::react_render_graphics',
  '  ReactAndroid::react_render_debug',
  '  ReactAndroid::react_utils',
  '  ReactAndroid::glog',
  '  ReactAndroid::react_render_mapbuffer',
  '  fbjni::fbjni',
  ')',
].join('\n');

patchFile(
  path.join(
    NM,
    'react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
  ),
  [
    {
      marker: 'find_package must be called before add_library',
      old: ghCMakeOld,
      replacement: ghCMakeReplacement,
    },
  ],
);

// ---------------------------------------------------------------------------
// 10. react-native-gesture-handler — build.gradle: extend packagingOptions excludes
// ---------------------------------------------------------------------------
patchFile(
  path.join(NM, 'react-native-gesture-handler/android/build.gradle'),
  [
    {
      marker: 'libreactnativejni.so',
      old: [
        '    packagingOptions {',
        '        // For some reason gradle only complains about the duplicated version of libreact_render libraries',
        '        // while there are more libraries copied in intermediates folder of the lib build directory, we exclude',
        '        // only the ones that make the build fail (ideally we should only include libgesturehandler but we',
        '        // are only allowed to specify exclude patterns)',
        '        exclude "**/libreact_render*.so"',
        '        exclude "**/libreactnative.so"',
        '        exclude "**/libjsi.so"',
        '        exclude "**/libc++_shared.so"',
        '        exclude "**/libfbjni.so"',
        '    }',
      ].join('\n'),
      replacement: [
        '    packagingOptions {',
        '        // For some reason gradle only complains about the duplicated version of libreact_render libraries',
        '        // while there are more libraries copied in intermediates folder of the lib build directory, we exclude',
        '        // only the ones that make the build fail (ideally we should only include libgesturehandler but we',
        '        // are only allowed to specify exclude patterns)',
        '        exclude "**/libreact_render*.so"',
        '        exclude "**/libreactnative.so"',
        '        // PATCH: RN 0.74 — exclude additional framework SOs to prevent duplicate conflicts',
        '        exclude "**/libreactnativejni.so"',
        '        exclude "**/libfolly_runtime.so"',
        '        exclude "**/libglog.so"',
        '        exclude "**/libreact_debug.so"',
        '        exclude "**/libreact_utils.so"',
        '        exclude "**/libjsi.so"',
        '        exclude "**/libc++_shared.so"',
        '        exclude "**/libfbjni.so"',
        '    }',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 9. react-native-svg@15.11.0 — create missing scripts/rnsvg_utils.rb
//    The file is referenced by RNSVG.podspec but was not included in the 15.11.0 npm
//    package. Content backported from react-native-svg@15.12.0.
// ---------------------------------------------------------------------------
const rnsvgUtilsPath = path.join(NM, 'react-native-svg/scripts/rnsvg_utils.rb');
const rnsvgUtilsContent = `# Copied from react-native-svg@15.12.0 scripts/rnsvg_utils.rb
# Added by postinstall.js for react-native-svg@15.11.0 compatibility (missing from 15.11.0 package)
def rnsvg_try_to_parse_react_native_package_json(node_modules_dir)
  react_native_package_json_path = File.join(node_modules_dir, 'react-native/package.json')
  if !File.exist?(react_native_package_json_path)
    return nil
  end
  return JSON.parse(File.read(react_native_package_json_path))
end

def rnsvg_find_config()
  result = {
    :react_native_version => nil,
    :react_native_minor_version => nil,
    :react_native_node_modules_dir => nil,
  }

  react_native_node_modules_dir = File.join(File.dirname(\`cd "\#{Pod::Config.instance.installation_root.to_s}" && node --print "require.resolve('react-native/package.json')"\`), '..')
  react_native_json = rnsvg_try_to_parse_react_native_package_json(react_native_node_modules_dir)

  if react_native_json == nil
    node_modules_dir = ENV["REACT_NATIVE_NODE_MODULES_DIR"]
    react_native_json = rnsvg_try_to_parse_react_native_package_json(node_modules_dir)
  end

  if react_native_json == nil
    raise '[RNSVG] Unable to recognize your \`react-native\` version. Please set environmental variable with \`react-native\` location: \`export REACT_NATIVE_NODE_MODULES_DIR="<path to react-native>" && pod install\`.'
  end

  result[:react_native_version] = react_native_json['version']
  result[:react_native_minor_version] = react_native_json['version'].split('.')[1].to_i
  if result[:react_native_minor_version] == 0 # nightly
    result[:react_native_minor_version] = 1000
  end
  result[:react_native_node_modules_dir] = File.expand_path(react_native_node_modules_dir)

  return result
end
`;

if (!fs.existsSync(rnsvgUtilsPath)) {
  fs.mkdirSync(path.dirname(rnsvgUtilsPath), { recursive: true });
  fs.writeFileSync(rnsvgUtilsPath, rnsvgUtilsContent, 'utf8');
  console.log('[postinstall] Created: node_modules/react-native-svg/scripts/rnsvg_utils.rb');
} else {
  console.log('[postinstall] Already up-to-date: node_modules/react-native-svg/scripts/rnsvg_utils.rb');
}

// ---------------------------------------------------------------------------
// 11. react-native-mmkv — fix Bridgeless mode JSI check
//    In RN New Architecture Bridgeless mode, global.nativeCallSyncHook does not
//    exist (it is a legacy Bridge concept). MMKV 2.x incorrectly treats its
//    absence as "not running on-device" and throws. The fix: only check
//    MMKVModule.install == null (which is the real JSI-unavailable signal).
//    Patch both commonjs and module builds.
// ---------------------------------------------------------------------------
const mmkvBridgelessPatch = [
  {
    marker: 'PATCH: Bridgeless mode - skip nativeCallSyncHook check',
    old: '    // Check if we are running on-device (JSI)\n    if (global.nativeCallSyncHook == null || MMKVModule.install == null) {',
    replacement: [
      '    // Check if we are running on-device (JSI)',
      '    // PATCH: Bridgeless mode - skip nativeCallSyncHook check',
      '    // In RN New Architecture Bridgeless mode, nativeCallSyncHook does not exist',
      '    // (legacy Bridge concept). JSI is always available in Bridgeless mode.',
      '    // We only check MMKVModule.install to determine if JSI is wired up.',
      '    if (MMKVModule.install == null) {',
    ].join('\n'),
  },
];

patchFile(
  path.join(NM, 'react-native-mmkv/lib/commonjs/createMMKV.js'),
  mmkvBridgelessPatch,
);

patchFile(
  path.join(NM, 'react-native-mmkv/lib/module/createMMKV.js'),
  mmkvBridgelessPatch,
);

// Also patch the TypeScript source so that if anyone rebuilds from source it still works
patchFile(
  path.join(NM, 'react-native-mmkv/src/createMMKV.ts'),
  [
    {
      marker: 'PATCH: Bridgeless mode - skip nativeCallSyncHook check',
      old: '    // Check if we are running on-device (JSI)\n    if (global.nativeCallSyncHook == null || MMKVModule.install == null) {',
      replacement: [
        '    // Check if we are running on-device (JSI)',
        '    // PATCH: Bridgeless mode - skip nativeCallSyncHook check',
        '    // In RN New Architecture Bridgeless mode, nativeCallSyncHook does not exist (legacy Bridge).',
        '    if (MMKVModule.install == null) {',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 12. react-native-gesture-handler — RNGestureHandlerRootView.kt
//    In Bridgeless/New Architecture mode, ReactContext.getNativeModule() throws
//    "Trying to call native module before CatalystInstance has been set!" because
//    CatalystInstance is never initialized in Bridgeless mode. Guard the
//    onAttachedToWindow initialization with a post() to defer until the view
//    is fully attached and the context is ready.
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/react/RNGestureHandlerRootView.kt',
  ),
  [
    {
      marker: 'PATCH: Bridgeless mode - always defer rootHelper init via post()',
      old: [
        '  override fun onAttachedToWindow() {',
        '    super.onAttachedToWindow()',
        '    rootViewEnabled = unstableForceActive || !hasGestureHandlerEnabledRootView(this)',
        '    if (!rootViewEnabled) {',
        '      Log.i(',
        '        ReactConstants.TAG,',
        '        "[GESTURE HANDLER] Gesture handler is already enabled for a parent view",',
        '      )',
        '    }',
        '    if (rootViewEnabled && rootHelper == null) {',
        '      rootHelper = RNGestureHandlerRootHelper(context as ReactContext, this)',
        '    }',
        '  }',
        '',
        '  fun tearDown() {',
        '    rootHelper?.tearDown()',
        '  }',
        '',
        '  override fun dispatchTouchEvent(event: MotionEvent) = if (rootViewEnabled && rootHelper!!.dispatchTouchEvent(event)) {',
        '    true',
        '  } else {',
        '    super.dispatchTouchEvent(event)',
        '  }',
        '',
        '  override fun dispatchGenericMotionEvent(ev: MotionEvent) =',
        '    if (rootViewEnabled && ev.isHoverAction() && rootHelper!!.dispatchTouchEvent(ev)) {',
        '      true',
        '    } else {',
        '      super.dispatchGenericMotionEvent(ev)',
        '    }',
        '',
        '  override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {',
        '    if (rootViewEnabled) {',
        '      rootHelper!!.requestDisallowInterceptTouchEvent()',
        '    }',
        '    super.requestDisallowInterceptTouchEvent(disallowIntercept)',
        '  }',
      ].join('\n'),
      replacement: [
        '  override fun onAttachedToWindow() {',
        '    super.onAttachedToWindow()',
        '    rootViewEnabled = unstableForceActive || !hasGestureHandlerEnabledRootView(this)',
        '    if (!rootViewEnabled) {',
        '      Log.i(',
        '        ReactConstants.TAG,',
        '        "[GESTURE HANDLER] Gesture handler is already enabled for a parent view",',
        '      )',
        '    }',
        '    if (rootViewEnabled && rootHelper == null) {',
        '      // PATCH: Bridgeless mode - always defer rootHelper init via post()',
        '      // onAttachedToWindow is called synchronously from Fabric\'s addViewAt during',
        '      // mount, before the ReactHost/CatalystInstance is ready. getNativeModule()',
        '      // throws in this context even in Bridgeless mode. Using post() defers to',
        '      // the next UI frame when the host is fully up.',
        '      post { initRootHelper() }',
        '    }',
        '  }',
        '',
        '  private fun initRootHelper() {',
        '    if (isAttachedToWindow && rootHelper == null && rootViewEnabled) {',
        '      // PATCH: Bridgeless mode - use ReactApplicationContext for getNativeModule',
        '      // ThemedReactContext does not override getNativeModule() to delegate to the',
        '      // BridgelessReactContext, so calling it directly on ThemedReactContext throws',
        '      // "CatalystInstance has not been set". We must go through reactApplicationContext',
        '      // which IS BridgelessReactContext and has a working getNativeModule() override.',
        '      val themedCtx = context as? com.facebook.react.uimanager.ThemedReactContext',
        '      val reactCtx: ReactContext = themedCtx?.reactApplicationContext ?: (context as ReactContext)',
        '      rootHelper = RNGestureHandlerRootHelper(reactCtx, this)',
        '    }',
        '  }',
        '',
        '  fun tearDown() {',
        '    rootHelper?.tearDown()',
        '  }',
        '',
        '  override fun dispatchTouchEvent(event: MotionEvent) = if (rootViewEnabled && rootHelper?.dispatchTouchEvent(event) == true) {',
        '    true',
        '  } else {',
        '    super.dispatchTouchEvent(event)',
        '  }',
        '',
        '  override fun dispatchGenericMotionEvent(ev: MotionEvent) =',
        '    if (rootViewEnabled && ev.isHoverAction() && rootHelper?.dispatchTouchEvent(ev) == true) {',
        '      true',
        '    } else {',
        '      super.dispatchGenericMotionEvent(ev)',
        '    }',
        '',
        '  override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {',
        '    if (rootViewEnabled) {',
        '      rootHelper?.requestDisallowInterceptTouchEvent()',
        '    }',
        '    super.requestDisallowInterceptTouchEvent(disallowIntercept)',
        '  }',
      ].join('\n'),
    },
  ],
);

// ---------------------------------------------------------------------------
// 13. react-native-gesture-handler — RNGestureHandlerRootHelper.kt
//    The init block calls context.getNativeModule() where context is a
//    ThemedReactContext. In Bridgeless mode, ThemedReactContext doesn't override
//    getNativeModule() to delegate to BridgelessReactContext, so it throws.
//    Fix: resolve module via reactApplicationContext instead.
// ---------------------------------------------------------------------------
patchFile(
  path.join(
    NM,
    'react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/react/RNGestureHandlerRootHelper.kt',
  ),
  [
    {
      marker: 'PATCH: Bridgeless mode - use reactApplicationContext for getNativeModule',
      old: [
        '    val module = context.getNativeModule(RNGestureHandlerModule::class.java)!!',
        '    val registry = module.registry',
      ].join('\n'),
      replacement: [
        '    // PATCH: Bridgeless mode - use reactApplicationContext for getNativeModule',
        '    // In Bridgeless/New Architecture mode, ThemedReactContext does not delegate',
        '    // getNativeModule() to BridgelessReactContext, so it throws "CatalystInstance',
        '    // has not been set". We must call getNativeModule on reactApplicationContext',
        '    // (which IS BridgelessReactContext and has a working override).',
        '    val appContext = if (context is ThemedReactContext) context.reactApplicationContext else context',
        '    val module = appContext.getNativeModule(RNGestureHandlerModule::class.java)!!',
        '    val registry = module.registry',
      ].join('\n'),
    },
  ],
);

console.log('[postinstall] Done.');
