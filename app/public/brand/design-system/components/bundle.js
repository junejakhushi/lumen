/* @ds-bundle: {"format":4,"namespace":"QuietHeritage","components":[{"name":"Button"},{"name":"TextLink"},{"name":"FilterChip"},{"name":"SegmentedControl"},{"name":"StoneSwatch"},{"name":"MetalSwatch"},{"name":"SwatchGroup"},{"name":"Stepper"},{"name":"TextField"},{"name":"Select"},{"name":"ConsentCheckbox"},{"name":"BottomSheet"},{"name":"Modal"},{"name":"Toast"},{"name":"PricePill"},{"name":"SpecTable"},{"name":"SlotPicker"},{"name":"RoughPreviewBadge"},{"name":"TrackingPill"},{"name":"ARTopBar"},{"name":"PieceCarousel"},{"name":"SizeSlider"},{"name":"ShutterButton"},{"name":"ARControlRail"},{"name":"AccessGate"},{"name":"LumenLockup"},{"name":"LumenMonogram"},{"name":"Icon"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement, useState = React.useState, useId = React.useId || function () { var r = React.useRef("qh" + Math.random().toString(36).slice(2, 8)); return r.current; };
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function st(s) { return s ? { "data-state": s } : {}; }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }
  function useCtl(value, def, onChange) {
    var s = useState(def), v = value !== undefined ? value : s[0];
    return [v, function (n) { if (value === undefined) s[1](n); if (onChange) onChange(n); }];
  }

  /* ---------- Icon: 24px line icons, 1.25 stroke, currentColor ---------- */
  var P = {"minus":"M6 12h12","plus":"M12 6v12M6 12h12","arrow-right":"M5 12h14M13 6l6 6-6 6","alert":"M12 3.5l9 16H3z M12 10v4.5 M12 17v.4","closer":"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5","diamond":"M12 3l6 9-6 9-6-9z","ar-try-on":"M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2M12 7.8l3.2 3.7L12 16.3l-3.2-4.8zM8.8 11.5h6.4","camera":"M5 7h2.8l1.4-2.1c.3-.4.7-.6 1.2-.6h3.2c.5 0 .9.2 1.2.6L16.2 7H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM8.4 13a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0","flip-camera":"M5 7h2.8l1.4-2.1c.3-.4.7-.6 1.2-.6h3.2c.5 0 .9.2 1.2.6L16.2 7H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM8.6 12.4a3.5 3.5 0 0 1 6.1-1.8M14.9 8.9v1.9H13M15.4 13.6a3.5 3.5 0 0 1-6.1 1.8M9.1 17.1v-1.9H11","snapshot":"M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M6.8 12a5.2 5.2 0 1 0 10.4 0a5.2 5.2 0 1 0 -10.4 0M17.6 4.6c.3.9.9 1.5 1.8 1.8-.9.3-1.5.9-1.8 1.8-.3-.9-.9-1.5-1.8-1.8.9-.3 1.5-.9 1.8-1.8z","necklace":"M4.2 3.8c-.5-.3-1 0-.8.6C4.8 11 8 15.3 12 15.3s7.2-4.3 8.6-10.9c.2-.6-.3-.9-.8-.6M12 15.3v1.5M12 16.8c-1.5 1.4-1.9 2.7-1.1 3.5.6.5 1.6.5 2.2 0 .8-.8.4-2.1-1.1-3.5z","choker":"M3.8 6.5C5.6 10.4 8.7 12 12 12s6.4-1.6 8.2-5.5M5.4 9.6C7.2 12.6 9.5 14 12 14s4.8-1.4 6.6-4.4M9 13.3v1.8M12 14v2.4M15 13.3v1.8M8.1 16a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M11.1 17.3a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0M14.1 16a0.9 0.9 0 1 0 1.8 0a0.9 0.9 0 1 0 -1.8 0","earring-jhumka":"M10.2 4.6c-.2-1.4.7-2.2 1.8-2.2 1.2 0 2 .9 1.7 2L12 6.2M10.5 7.8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M12 9.3v1.4M6.5 17.2c0-3.4 2.4-6.2 5.5-6.2s5.5 2.8 5.5 6.2zM9 13.6c.6-.9 1.6-1.6 3-1.8M7.1 19.4a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0M9.8 20.1a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0M12.6 20.1a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0M15.3 19.4a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0","earring-stud":"M9.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M10.1 7.4a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M14.1 9.7a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M14.1 14.3a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M10.1 16.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M6.1 14.3a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M6.1 9.7a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0","bracelet":"M20.5 12c0 3-3.8 5.5-8.5 5.5S3.5 15 3.5 12s3.8-5.5 8.5-5.5 8.5 2.5 8.5 5.5zM18.3 12.5c-.8 1.8-3.3 3-6.3 3s-5.5-1.2-6.3-3M6.6 16a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0M11.2 17.5a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0M15.8 16a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0","bangle":"M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M5.6 12a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0 -12.8 0M12 3.5v2.1M12 18.4v2.1M3.5 12h2.1M18.4 12h2.1","ring":"M9.4 10.3a6 6 0 1 0 5.2 0M9 6.6h6l1.6 1.9L12 12.6 7.4 8.5zM7.4 8.5h9.2M10.5 6.6 10 8.5l2 4.1 2-4.1-.5-1.9","pendant":"M5 3.2c1.4 3.2 3.8 6 6.1 7.5M19 3.2c-1.4 3.2-3.8 6-6.1 7.5M11 11.6a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M12 12.6c-2.8 2.3-3.7 4.5-3 6.1.5 1.2 1.7 1.9 3 1.9s2.5-.7 3-1.9c.7-1.6-.2-3.8-3-6.1z","maang-tikka":"M9.6 4.2C10.3 3 11.1 2.5 12 2.5s1.7.5 2.4 1.7M12 2.5v7.5M8.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M10.8 13.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0M12 17v1.4M10.8 19.6a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0","set":"M7 4.5c.8 6 2.7 9.4 5 9.4s4.2-3.4 5-9.4M12 13.9v1.3M10.4 16.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M3.6 3.6v4.2M2.3 9.1a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0M20.4 3.6v4.2M19.1 9.1a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0","metal":"M3.5 18h17l-3-7.5h-11zM6.5 10.5l2-3.5h7l2 3.5M8.5 14h3.5","karat":"M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M10 7.8v8.4M15 7.8l-5 4.6M11.6 11l3.6 5.2","stone":"M7 5h10l3.5 4.5L12 20.5 3.5 9.5zM3.5 9.5h17M9.5 5 8 9.5l4 11 4-11L14.5 5","size":"M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M7.6 12h8.8M9.3 10.3 7.6 12l1.7 1.7M14.7 10.3l1.7 1.7-1.7 1.7","length":"M3.5 9h17a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM6 9v2.5M9 9v3.5M12 9v2.5M15 9v3.5M18 9v2.5","weight":"M12 3.6v16.4M8.5 20.3h7M4.5 6.5c2.5.6 5 .9 7.5.9s5-.3 7.5-.9M4.5 6.5 2.6 12.6M4.5 6.5l1.9 6.1M19.5 6.5l-1.9 6.1M19.5 6.5l1.9 6.1M2.4 12.6a2.1 2.1 0 0 0 4.2 0zM17.4 12.6a2.1 2.1 0 0 0 4.2 0z","budget-rupee":"M7.5 5h9M7.5 9h9M10 5c3 0 4.6 1.4 4.6 3.4S13 12.2 10 12.2H8.2l6.8 7.3","calendar":"M6 5h12a2.5 2.5 0 0 1 2.5 2.5V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V7.5A2.5 2.5 0 0 1 6 5zM3.5 9.8h17M8 3v4M16 3v4M15.5 13.5l1.3 1.6-1.3 1.6-1.3-1.6z","clock":"M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M12 7.2V12l3.1 2","studio-visit":"M6 20.5V11.2c0-3.8 2.7-6.3 6-7.7 3.3 1.4 6 3.9 6 7.7v9.3M3.5 20.5h17M10 20.5v-5.3a2 2 0 0 1 4 0v5.3","video-call":"M4.5 6.5h9.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM16 10.4l4.3-2.6c.5-.3 1.2.1 1.2.7v7c0 .6-.7 1-1.2.7L16 13.6","compare":"M5 4.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM12 4.5v15M8.8 12H5.8M7.3 10.5 5.8 12l1.5 1.5M15.2 12h3M16.7 10.5l1.5 1.5-1.5 1.5","undo":"M8.8 5.5 4.5 9.8l4.3 4.3M4.5 9.8h10.2a5 5 0 0 1 0 10h-3.5c-.6 0-1-.3-1.2-.7","save-look":"M7 3.5h10a1 1 0 0 1 1 1v16l-6-4.2-6 4.2v-16a1 1 0 0 1 1-1zM12 7.3l1.7 2.1-1.7 2.2-1.7-2.2z","share":"M12 14.5v-11M8.2 7.3 12 3.5l3.8 3.8M8.5 10.2H7a2 2 0 0 0-2 2v6.3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.3a2 2 0 0 0-2-2h-1.5","download-pdf":"M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5zM14 3.5v3a2 2 0 0 0 2 2h3M12 10.5v6.5M9.5 14.6 12 17.1l2.5-2.5","chat":"M4 11.5c0-4 3.6-7 8-7s8 3 8 7-3.6 7-8 7c-1 0-2-.2-2.9-.5L5 19.5l1.2-3.4C4.8 14.9 4 13.3 4 11.5zM8.5 11.5h.1M12 11.5h.1M15.5 11.5h.1","phone":"M6.6 3.5h2.3c.4 0 .8.3.9.7l1 3.2c.1.4 0 .8-.3 1.1L9 9.8a11.5 11.5 0 0 0 5.2 5.2l1.3-1.5c.3-.3.7-.4 1.1-.3l3.2 1c.4.1.7.5.7.9v2.3a2 2 0 0 1-2 2C11 19.4 4.6 13 4.6 5.5a2 2 0 0 1 2-2z","email":"M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM3.6 7.1 12 13l8.4-5.9","location-pin":"M12 21s6.5-6.1 6.5-11.2a6.5 6.5 0 0 0-13 0C5.5 14.9 12 21 12 21zM9.6 9.8a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0","check":"M4.8 12.9 9 17.1c2.9-4.4 6.3-7.9 10.2-10.4","close":"M6 6l12 12M18 6 6 18","info":"M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M12 11v5.5M12 7.9v.1","chevron-up":"M6 14.8c2.1-2 4.1-4 6-6 1.9 2 3.9 4 6 6","chevron-down":"M6 9.2c2.1 2 4.1 4 6 6 1.9-2 3.9-4 6-6","chevron-left":"M14.8 6c-2 2.1-4 4.1-6 6 2 1.9 4 3.9 6 6","chevron-right":"M9.2 6c2 2.1 4 4.1 6 6-2 1.9-4 3.9-6 6","filter":"M4 7h9M17 7h3M4 12h3M11 12h9M4 17h10M18 17h2M13 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M7 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M14 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0","search":"M4 10.5a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0M15.3 15.3l4.9 4.9","3d-rotate":"M9 17.6c-3.3-.5-5.5-1.9-5.5-3.6 0-2.2 3.8-4 8.5-4s8.5 1.8 8.5 4c0 1.7-2.2 3.1-5.5 3.6M13.3 16l1.8 1.7-1.8 1.8M12 3.5l2.6 3.1L12 10.6 9.4 6.6zM9.4 6.6h5.2","hallmark-shield":"M12 3.3l7 2.6v5.6c0 4.4-2.9 7.7-7 9.2-4.1-1.5-7-4.8-7-9.2V5.9zM9 12.1l2.1 2.1 4-4.3","lock":"M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.3v2.4","eye-off":"M9.9 6.3c.7-.2 1.4-.3 2.1-.3 5.7 0 9 6 9 6s-.8 1.5-2.4 3.1M6.4 7.9C4.3 9.5 3 12 3 12s3.3 6 9 6c1.7 0 3.1-.5 4.3-1.2M10 10.1a2.8 2.8 0 0 0 3.9 3.9M4.5 4.5l15 15"};
  function Icon(p) {
    var size = p.size || 20;
    return h("svg", { className: cx("qh-icon", p.className), width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: p.strokeWidth || 1.25, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": p.title ? undefined : "true", role: p.title ? "img" : undefined },
      p.title ? h("title", null, p.title) : null, h("path", { d: P[p.name] || "" }));
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || "primary";
    var rest = omit(p, ["variant", "size", "block", "state", "className", "children", "href", "icon"]);
    var props = Object.assign({ className: cx("qh-btn", "qh-btn--" + variant, p.size === "sm" && "qh-btn--sm", p.block && "qh-btn--block", p.className) }, st(p.state), rest);
    var kids = [p.children, p.icon ? h(Icon, { key: "i", name: p.icon, size: 18 }) : null];
    if (p.href) { if (p.disabled) { props["aria-disabled"] = "true"; delete props.href; } return h("a", Object.assign({ href: p.disabled ? undefined : p.href }, props), kids); }
    return h("button", Object.assign({ type: "button" }, props), kids);
  }

  /* ---------- TextLink ---------- */
  function TextLink(p) {
    var rest = omit(p, ["state", "className", "children", "disabled"]);
    return h("a", Object.assign({ href: "#", className: cx("qh-link", p.className) }, st(p.state), p.disabled ? { "aria-disabled": "true", href: undefined, role: "link" } : {}, p.disabled ? omit(rest, ["href"]) : rest), p.children);
  }

  /* ---------- FilterChip ---------- */
  function FilterChip(p) {
    var c = useCtl(p.selected, !!p.defaultSelected, p.onChange);
    return h("button", Object.assign({ type: "button", className: cx("qh-chip", p.className), "aria-pressed": c[0] ? "true" : "false", disabled: p.disabled, onClick: function () { c[1](!c[0]); } }, st(p.state)),
      c[0] ? h(Icon, { name: "check", size: 16 }) : null, p.children, p.count != null ? h("span", { className: "qh-chip__count" }, p.count) : null);
  }

  /* ---------- SegmentedControl (radiogroup, arrow keys) ---------- */
  function norm(o) { return typeof o === "object" ? o : { value: String(o), label: String(o) }; }
  function SegmentedControl(p) {
    var opts = (p.options || []).map(norm), id = useId();
    var c = useCtl(p.value, p.defaultValue !== undefined ? p.defaultValue : (opts[0] || {}).value, p.onChange);
    function key(e, i) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0; if (!d) return;
      e.preventDefault(); var n = i; for (var k = 0; k < opts.length; k++) { n = (n + d + opts.length) % opts.length; if (!opts[n].disabled) break; }
      c[1](opts[n].value); var el = e.currentTarget.parentNode.children[n]; if (el) el.focus();
    }
    return h("div", { className: cx("qh-seg", p.className) },
      p.label ? h("span", { className: "qh-label", id: id + "l" }, p.label) : null,
      h("div", { className: "qh-seg__track", role: "radiogroup", "aria-labelledby": p.label ? id + "l" : undefined, "aria-label": p.label ? undefined : p["aria-label"] },
        opts.map(function (o, i) {
          var on = o.value === c[0];
          return h("button", Object.assign({ key: o.value, type: "button", role: "radio", className: "qh-seg__opt", "aria-checked": on ? "true" : "false", tabIndex: on ? 0 : -1, disabled: o.disabled || p.disabled, onClick: function () { c[1](o.value); }, onKeyDown: function (e) { key(e, i); } }, p.states && p.states[o.value] ? st(p.states[o.value]) : {}),
            o.swatch ? h("span", { className: "qh-seg__dot", style: { background: o.swatch } }) : null, o.label);
        })));
  }

  /* ---------- Faceted gem disc ---------- */
  var GEMS = {
    diamond: { name: "Diamond", fill: "var(--gem-diamond)", line: "rgba(27,25,22,.30)", tint: "rgba(27,25,22,.07)" },
    ruby: { name: "Ruby", fill: "var(--gem-ruby)", line: "rgba(245,240,232,.42)", tint: "rgba(245,240,232,.16)" },
    emerald: { name: "Emerald", fill: "var(--gem-emerald)", line: "rgba(245,240,232,.40)", tint: "rgba(245,240,232,.14)" },
    sapphire: { name: "Sapphire", fill: "var(--gem-sapphire)", line: "rgba(245,240,232,.40)", tint: "rgba(245,240,232,.14)" },
    pearl: { name: "Pearl", fill: "var(--gem-pearl)" },
    polki: { name: "Polki", fill: "var(--gem-polki)", line: "rgba(27,25,22,.26)", tint: "rgba(245,240,232,.45)" }
  };
  function oct(r, rot) { var a = []; for (var i = 0; i < 8; i++) { var t = (Math.PI / 4) * i + rot; a.push([16 + r * Math.cos(t), 16 + r * Math.sin(t)]); } return a; }
  function pts(a) { return a.map(function (q) { return q[0].toFixed(2) + "," + q[1].toFixed(2); }).join(" "); }
  function GemArt(p) {
    var g = GEMS[p.stone] || GEMS.diamond, kids = [h("circle", { key: "b", cx: 16, cy: 16, r: 16, style: { fill: g.fill } })];
    if (p.stone === "pearl") {
      kids.push(h("ellipse", { key: "hl", cx: 12, cy: 11, rx: 5, ry: 3.6, fill: "rgba(255,255,255,.75)" }), h("circle", { key: "sh", cx: 16, cy: 16, r: 14.5, fill: "none", stroke: "rgba(27,25,22,.10)", strokeWidth: 1 }));
    } else if (p.stone === "polki") {
      [["16,16 4,9 11,3", 1], ["16,16 11,3 23,4", 0], ["16,16 23,4 29,14", 1], ["16,16 29,14 25,27", 0], ["16,16 25,27 12,29", 1], ["16,16 12,29 3,21", 0], ["16,16 3,21 4,9", 1]].forEach(function (f, i) {
        kids.push(h("polygon", { key: "f" + i, points: f[0], fill: f[1] ? g.tint : "none", stroke: g.line, strokeWidth: 0.6 }));
      });
    } else {
      var t = oct(6.5, Math.PI / 8), o = oct(16, Math.PI / 8), m = oct(11.5, 0);
      kids.push(h("polygon", { key: "t", points: pts(t), fill: g.tint, stroke: g.line, strokeWidth: 0.6 }));
      for (var i = 0; i < 8; i++) {
        kids.push(h("path", { key: "s" + i, d: "M" + t[i].join(",") + "L" + m[(i + 1) % 8].join(",") + "L" + t[(i + 1) % 8].join(",") + "M" + m[(i + 1) % 8].join(",") + "L" + o[i].join(",") + "M" + m[(i + 1) % 8].join(",") + "L" + o[(i + 1) % 8].join(","), fill: "none", stroke: g.line, strokeWidth: 0.6 }));
      }
    }
    return h("svg", { viewBox: "0 0 32 32", "aria-hidden": "true" }, kids);
  }

  var METALS = { yellow: { name: "Yellow gold", fill: "var(--metal-yellow)" }, white: { name: "White gold", fill: "var(--metal-white)" }, rose: { name: "Rose gold", fill: "var(--metal-rose)" } };
  function MetalArt(p) {
    var m = METALS[p.metal] || METALS.yellow;
    return h("svg", { viewBox: "0 0 32 32", "aria-hidden": "true" }, h("circle", { cx: 16, cy: 16, r: 16, style: { fill: m.fill } }), h("circle", { cx: 16, cy: 16, r: 9, fill: "none", stroke: "rgba(27,25,22,.18)", strokeWidth: 0.8 }), h("path", { d: "M9 11.5a9 9 0 0 1 5-4", fill: "none", stroke: "rgba(255,255,255,.6)", strokeWidth: 1.2, strokeLinecap: "round" }));
  }
  function swatchBtn(kind, p, art, label) {
    var role = p.role;
    return h("button", Object.assign({ type: "button", className: cx("qh-swatch", p.className), disabled: p.disabled, onClick: p.onSelect, "aria-label": p.showLabel ? undefined : label + (p.disabled ? " (unavailable)" : ""), tabIndex: p.tabIndex, onKeyDown: p.onKeyDown }, role ? { role: role, "aria-checked": p.selected ? "true" : "false" } : { "aria-pressed": p.selected ? "true" : "false" }, st(p.state)),
      h("span", { className: "qh-swatch__disc" }, art), p.showLabel ? h("span", { className: "qh-swatch__name" }, label) : null);
  }
  function StoneSwatch(p) { var g = GEMS[p.stone] || GEMS.diamond; return swatchBtn("stone", p, h(GemArt, { stone: p.stone }), p.label || g.name); }
  function MetalSwatch(p) { var m = METALS[p.metal] || METALS.yellow; return swatchBtn("metal", p, h(MetalArt, { metal: p.metal }), p.label || m.name); }
  function SwatchGroup(p) {
    var kind = p.kind || "stone", opts = p.options || (kind === "metal" ? ["yellow", "white", "rose"] : ["diamond", "ruby", "emerald", "sapphire", "pearl", "polki"]), id = useId();
    var c = useCtl(p.value, p.defaultValue !== undefined ? p.defaultValue : opts[0], p.onChange);
    var dis = p.unavailable || [];
    function key(e, i) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0; if (!d) return; e.preventDefault();
      var n = i; for (var k = 0; k < opts.length; k++) { n = (n + d + opts.length) % opts.length; if (dis.indexOf(opts[n]) < 0) break; }
      c[1](opts[n]); var el = e.currentTarget.parentNode.children[n]; if (el) el.focus();
    }
    return h("div", { className: cx("qh-swatches", p.className) },
      p.label ? h("span", { className: "qh-label", id: id + "l" }, p.label, p.showValue !== false ? h("span", { style: { color: "var(--text)", marginLeft: 8 } }, (kind === "metal" ? METALS[c[0]] : GEMS[c[0]] || {}).name) : null) : null,
      h("div", { className: "qh-swatches__row", role: "radiogroup", "aria-labelledby": p.label ? id + "l" : undefined, "aria-label": p.label ? undefined : (kind === "metal" ? "Metal" : "Stone") },
        opts.map(function (o, i) {
          var q = { key: o, role: "radio", selected: o === c[0], disabled: dis.indexOf(o) >= 0, tabIndex: o === c[0] ? 0 : -1, showLabel: p.showLabels, onSelect: function () { c[1](o); }, onKeyDown: function (e) { key(e, i); } };
          return kind === "metal" ? h(MetalSwatch, Object.assign({ metal: o }, q)) : h(StoneSwatch, Object.assign({ stone: o }, q));
        })));
  }

  /* ---------- Stepper ---------- */
  function Stepper(p) {
    var min = p.min != null ? p.min : 0, max = p.max != null ? p.max : 99, step = p.step || 1, fmt = p.format || String, id = useId();
    var c = useCtl(p.value, p.defaultValue != null ? p.defaultValue : min, p.onChange);
    function set(n) { n = Math.round(Math.min(max, Math.max(min, n)) * 1000) / 1000; c[1](n); }
    return h("div", { className: cx("qh-stepper", p.disabled && "qh-stepper--disabled", p.className), role: "group", "aria-labelledby": id + "l" },
      h("span", { className: "qh-label", id: id + "l" }, p.label || "Size"),
      h("div", { className: "qh-stepper__row" },
        h("button", Object.assign({ type: "button", className: "qh-stepper__btn", "aria-label": "Decrease " + (p.label || "size").toLowerCase(), disabled: p.disabled || c[0] <= min, onClick: function () { set(c[0] - step); } }, p.states ? st(p.states.minus) : {}), h(Icon, { name: "minus" })),
        h("output", { className: "qh-stepper__val", "aria-live": "polite" }, fmt(c[0])),
        h("button", Object.assign({ type: "button", className: "qh-stepper__btn", "aria-label": "Increase " + (p.label || "size").toLowerCase(), disabled: p.disabled || c[0] >= max, onClick: function () { set(c[0] + step); } }, p.states ? st(p.states.plus) : {}), h(Icon, { name: "plus" }))),
      p.hint ? h("span", { className: "qh-field__hint" }, p.hint) : null);
  }

  /* ---------- TextField / Select ---------- */
  function fieldWrap(p, id, control) {
    return h("div", { className: cx("qh-field", p.className), style: p.style },
      h("label", { className: "qh-label", htmlFor: id }, p.label, p.optional ? h("span", { style: { fontWeight: 400 } }, " · optional") : null),
      control,
      p.error ? h("span", { className: "qh-field__error", id: id + "e" }, h(Icon, { name: "alert", size: 18 }), p.error) : p.hint ? h("span", { className: "qh-field__hint", id: id + "h" }, p.hint) : null);
  }
  function TextField(p) {
    var auto = useId(), id = p.id || auto;
    var rest = omit(p, ["label", "hint", "error", "state", "className", "style", "optional", "inputClassName"]);
    return fieldWrap(p, id, h("div", { className: "qh-field__control" }, h("input", Object.assign({ id: id, type: "text", className: cx("qh-input", p.inputClassName), "aria-invalid": p.error ? "true" : undefined, "aria-describedby": p.error ? id + "e" : p.hint ? id + "h" : undefined }, st(p.state), rest))));
  }
  function Select(p) {
    var auto = useId(), id = p.id || auto;
    var rest = omit(p, ["label", "hint", "error", "state", "className", "style", "optional", "options", "placeholder"]);
    return fieldWrap(p, id, h("div", { className: "qh-field__control" },
      h("select", Object.assign({ id: id, className: "qh-input qh-select", "aria-invalid": p.error ? "true" : undefined, "aria-describedby": p.error ? id + "e" : p.hint ? id + "h" : undefined, defaultValue: p.value === undefined && p.defaultValue === undefined && p.placeholder ? "" : undefined }, st(p.state), rest),
        p.placeholder ? h("option", { value: "", disabled: true }, p.placeholder) : null,
        (p.options || []).map(function (o) { o = norm(o); return h("option", { key: o.value, value: o.value }, o.label); })),
      h(Icon, { name: "chevron-down", size: 18, className: "qh-select-chev" })));
  }

  /* ---------- ConsentCheckbox ---------- */
  function ConsentCheckbox(p) {
    var c = useCtl(p.checked, !!p.defaultChecked, p.onChange), id = useId();
    return h("div", null,
      h("label", Object.assign({ className: cx("qh-check", p.disabled && "qh-check--disabled", p.error && "qh-check--invalid", p.className) }, st(p.state)),
        h("input", { type: "checkbox", checked: c[0], disabled: p.disabled, required: p.required, "aria-invalid": p.error ? "true" : undefined, "aria-describedby": p.error ? id + "e" : undefined, onChange: function (e) { c[1](e.target.checked); } }),
        h("span", { className: "qh-check__box", "aria-hidden": "true" }, c[0] ? h(Icon, { name: "check", size: 16, strokeWidth: 1.6 }) : null),
        h("span", null, p.children, p.required ? h("span", { className: "qh-check__req" }, " (required)") : null)),
      p.error ? h("span", { className: "qh-field__error", id: id + "e", style: { paddingLeft: 34 } }, h(Icon, { name: "alert", size: 18 }), p.error) : null);
  }

  /* ---------- BottomSheet / Modal ---------- */
  function overlayHead(p, id) {
    return h("div", { className: "qh-overlay__head" }, h("h2", { className: "qh-overlay__title", id: id }, p.title),
      p.onClose !== null ? h("button", { type: "button", className: "qh-iconbtn", "aria-label": "Close", onClick: p.onClose }, h(Icon, { name: "close" })) : null);
  }
  function BottomSheet(p) {
    var id = useId(); if (p.open === false) return null;
    return h("div", { className: cx("qh-scrim", p.inline && "qh-scrim--inline"), onClick: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h("section", { className: "qh-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": id },
        h("div", { className: "qh-sheet__grip", "aria-hidden": "true" }), overlayHead(p, id),
        h("div", { className: "qh-overlay__body" }, p.children), p.footer ? h("div", { className: "qh-overlay__foot" }, p.footer) : null));
  }
  function Modal(p) {
    var id = useId(); if (p.open === false) return null;
    return h("div", { className: cx("qh-scrim", p.inline && "qh-scrim--inline"), onClick: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h("section", { className: "qh-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": id },
        overlayHead(p, id), h("div", { className: "qh-overlay__body" }, p.children), p.actions ? h("div", { className: "qh-overlay__foot" }, p.actions) : null));
  }

  /* ---------- Toast ---------- */
  function Toast(p) {
    return h("div", { className: cx("qh-toast", "qh-toast--" + (p.tone || "neutral"), p.className), role: p.tone === "error" ? "alert" : "status" },
      h("span", { className: "qh-toast__mark", "aria-hidden": "true" }), h("span", { className: "qh-toast__msg" }, p.children),
      p.action ? h("button", { type: "button", className: "qh-toast__action", onClick: p.onAction }, p.action) : null,
      p.onClose ? h("button", { type: "button", className: "qh-iconbtn", "aria-label": "Dismiss", onClick: p.onClose }, h(Icon, { name: "close", size: 18 })) : null);
  }

  /* ---------- PricePill ---------- */
  function PricePill(p) {
    var cur = p.currency || "₹", unit = p.unit || "L", label = p.label || "Indicative";
    var val = p.children || (p.high != null ? cur + p.low + "–" + p.high + unit : cur + p.low + unit);
    var spoken = p.high != null ? label + " price " + p.low + " to " + p.high + (unit === "L" ? " lakh rupees" : unit) : undefined;
    return h("span", { className: cx("qh-price", p.className), "aria-label": p.children ? undefined : spoken },
      h("span", { className: "qh-price__label", "aria-hidden": spoken ? "true" : undefined }, label), h("span", { className: "qh-price__val", "aria-hidden": spoken ? "true" : undefined }, val));
  }

  /* ---------- SpecTable ---------- */
  var SPEC_DEFAULT = [{ label: "Code", value: "LM-JH-0214" }, { label: "Metal", value: "Yellow gold" }, { label: "Karat", value: "18K" }, { label: "Weight", value: "14.2 g" }, { label: "Length", value: "48 mm" }, { label: "Width", value: "32 mm" }];
  function SpecTable(p) {
    return h("table", { className: cx("qh-spec", p.className) }, p.caption ? h("caption", null, p.caption) : null,
      h("tbody", null, (p.rows || SPEC_DEFAULT).map(function (r) { return h("tr", { key: r.label }, h("th", { scope: "row" }, r.label), h("td", null, r.value)); })));
  }

  /* ---------- SlotPicker (IST + viewer's local time) ---------- */
  function fmt(d, tz, o) { return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: tz }, o)).format(d); }
  function tzAbbr(d, tz) { try { var x = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(d).filter(function (q) { return q.type === "timeZoneName"; })[0]; return x ? x.value : tz; } catch (e) { return tz; } }
  function SlotPicker(p) {
    var ATELIER = p.atelierTimeZone || "Asia/Kolkata";
    var local = p.localTimeZone || (Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
    var city = p.localLabel || local.split("/").pop().replace(/_/g, " ");
    var un = p.unavailable || [];
    var slots = (p.slots || []).map(function (s) { return new Date(s); });
    var days = []; slots.forEach(function (d) { var k = fmt(d, ATELIER, { year: "numeric", month: "2-digit", day: "2-digit" }); if (days.indexOf(k) < 0) days.push(k); });
    var dayS = useState(p.defaultDay || days[0]); var day = dayS[0];
    var c = useCtl(p.value, p.defaultValue, p.onChange);
    var shown = slots.filter(function (d) { return fmt(d, ATELIER, { year: "numeric", month: "2-digit", day: "2-digit" }) === day; });
    var t = { hour: "numeric", minute: "2-digit" };
    return h("div", { className: cx("qh-slots", p.className) },
      h("div", { className: "qh-slots__tz" }, h("span", null, "Times in IST, the atelier's time"), h("span", null, "Yours beneath · " + city)),
      h("div", { className: "qh-slots__days", role: "tablist", "aria-label": "Day" }, days.map(function (k) {
        var d = slots.filter(function (q) { return fmt(q, ATELIER, { year: "numeric", month: "2-digit", day: "2-digit" }) === k; })[0];
        return h("button", { key: k, type: "button", role: "tab", className: "qh-day", "aria-selected": k === day ? "true" : "false", onClick: function () { dayS[1](k); } },
          h("span", { className: "qh-day__wd" }, fmt(d, ATELIER, { weekday: "short" })), h("span", { className: "qh-day__d" }, fmt(d, ATELIER, { day: "numeric" })), h("span", { className: "qh-day__wd", style: { fontSize: 12 } }, fmt(d, ATELIER, { month: "short" })));
      })),
      h("div", { className: "qh-slots__grid", role: "radiogroup", "aria-label": "Time" }, shown.map(function (d) {
        var iso = d.toISOString(), off = un.indexOf(iso) >= 0 || un.indexOf(iso.replace(".000", "")) >= 0, on = c[0] && new Date(c[0]).getTime() === d.getTime();
        var localDay = fmt(d, local, { weekday: "short" }) !== fmt(d, ATELIER, { weekday: "short" }) ? fmt(d, local, { weekday: "short" }) + " " : "";
        return h("button", Object.assign({ key: iso, type: "button", role: "radio", className: "qh-slot", "aria-checked": on ? "true" : "false", disabled: off, onClick: function () { c[1](iso); } }, p.states ? st(p.states[iso] || p.states[iso.replace(".000", "")]) : {}),
          h("span", { className: "qh-slot__ist" }, fmt(d, ATELIER, t) + " IST"),
          h("span", { className: "qh-slot__local" }, off ? "Taken" : localDay + fmt(d, local, t) + " " + tzAbbr(d, local)));
      })));
  }

  /* ---------- AR: badges ---------- */
  function RoughPreviewBadge(p) {
    return h("span", { className: cx("qh-rough", p.className), title: p.title || "A quick visual guide. The finished piece is made by hand and will differ slightly." }, h(Icon, { name: "diamond", size: 12, strokeWidth: 1.5 }), p.children || "Rough preview");
  }
  var TRACK = { finding: "Finding you…", good: "Looking good", closer: "Move a little closer" };
  function TrackingPill(p) {
    var s = p.status || "finding";
    var ind = s === "finding" ? h("span", { className: "qh-track__dots" }, h("i"), h("i"), h("i")) : s === "good" ? h(Icon, { name: "check", size: 18, strokeWidth: 1.6 }) : h(Icon, { name: "closer", size: 18, strokeWidth: 1.5 });
    return h("div", { className: cx("qh-track", "qh-track--" + s, p.className), role: "status", "aria-live": "polite" }, h("span", { className: "qh-track__ind", "aria-hidden": "true" }, ind), p.children || TRACK[s]);
  }
  function ARTopBar(p) {
    return h("header", { className: cx("qh-artop", p.className) },
      h("button", { type: "button", className: "qh-artop__close", "aria-label": p.closeLabel || "Close try-on", onClick: p.onClose }, h(Icon, { name: "close" })),
      h("div", { className: "qh-artop__title" }, h("p", { className: "qh-artop__name" }, p.pieceName || "Peacock jhumka"), p.detail ? h("span", { className: "qh-artop__detail" }, p.detail) : null),
      p.rough === false ? h("span") : h(RoughPreviewBadge));
  }

  /* ---------- AR: piece glyphs (line drawings, currentColor) ---------- */
  var GLYPH = {
    jhumka: [["path", { d: "M20 4v5" }], ["circle", { cx: 20, cy: 12, r: 3 }], ["path", { d: "M11 29c0-7 4-12 9-12.5 5 .5 9 5.5 9 12.5z" }], ["path", { d: "M14 29c.5-4 2.5-7 6-8M26 29c-.5-4-2.5-7-6-8" }], ["circle", { cx: 12.5, cy: 33, r: 1.3 }], ["circle", { cx: 16.2, cy: 34, r: 1.3 }], ["circle", { cx: 20, cy: 34.4, r: 1.3 }], ["circle", { cx: 23.8, cy: 34, r: 1.3 }], ["circle", { cx: 27.5, cy: 33, r: 1.3 }]],
    chandbali: [["path", { d: "M20 4v7" }], ["circle", { cx: 20, cy: 13, r: 2 }], ["path", { d: "M8 16a12 12 0 0 0 24 0" }], ["path", { d: "M13 16a7 7 0 0 0 14 0" }], ["path", { d: "M8 16h5M27 16h5" }], ["circle", { cx: 12, cy: 31, r: 1.2 }], ["circle", { cx: 20, cy: 33.5, r: 1.2 }], ["circle", { cx: 28, cy: 31, r: 1.2 }]],
    polki: [["circle", { cx: 20, cy: 20, r: 5 }], ["circle", { cx: 20, cy: 10, r: 3.2 }], ["circle", { cx: 28.7, cy: 15, r: 3.2 }], ["circle", { cx: 28.7, cy: 25, r: 3.2 }], ["circle", { cx: 20, cy: 30, r: 3.2 }], ["circle", { cx: 11.3, cy: 25, r: 3.2 }], ["circle", { cx: 11.3, cy: 15, r: 3.2 }]],
    drop: [["path", { d: "M20 4v9" }], ["circle", { cx: 20, cy: 15, r: 2.2 }], ["path", { d: "M20 17.5v2" }], ["ellipse", { cx: 20, cy: 27, rx: 5.5, ry: 7 }], ["path", { d: "M17.5 24a3 3 0 0 1 2-2" }]],
    paisley: [["path", { d: "M24 7c8 3 9 18-2 24-6 3-12-1-11-7 1-5 7-6 9-2 1.5 3-1 5-3 4" }], ["path", { d: "M24 7c-3 0-5 2-5 4" }], ["circle", { cx: 21, cy: 20, r: 1.2 }]],
    choker: [["path", { d: "M5 11c4 10 26 10 30 0" }], ["path", { d: "M8 16c5 7 19 7 24 0" }], ["path", { d: "M14 22v3M20 23.5v4M26 22v3" }], ["circle", { cx: 14, cy: 26.5, r: 1.3 }], ["circle", { cx: 20, cy: 29, r: 1.5 }], ["circle", { cx: 26, cy: 26.5, r: 1.3 }]]
  };
  function PieceGlyph(p) { return h("svg", { width: p.size || 36, height: p.size || 36, viewBox: "0 0 40 40", fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, (GLYPH[p.glyph] || GLYPH.jhumka).map(function (e, i) { return h(e[0], Object.assign({ key: i }, e[1])); })); }
  var PIECES = [{ id: "jhumka", name: "Jhumka", glyph: "jhumka" }, { id: "chandbali", name: "Chandbali", glyph: "chandbali" }, { id: "polki", name: "Polki stud", glyph: "polki" }, { id: "drop", name: "Pearl drop", glyph: "drop" }, { id: "paisley", name: "Paisley", glyph: "paisley" }, { id: "choker", name: "Choker", glyph: "choker" }];
  function PieceCarousel(p) {
    var list = p.pieces || PIECES, c = useCtl(p.value, p.defaultValue || list[0].id, p.onChange);
    return h("div", { className: cx("qh-carousel", p.className), role: "radiogroup", "aria-label": p["aria-label"] || "Piece" }, list.map(function (q) {
      var on = q.id === c[0];
      return h("button", { key: q.id, type: "button", role: "radio", "aria-checked": on ? "true" : "false", className: "qh-piece", onClick: function () { c[1](q.id); } },
        h("span", { className: "qh-piece__thumb" }, q.thumb ? h("img", { src: q.thumb, alt: "", width: 48, height: 48, style: { borderRadius: "50%" } }) : h(PieceGlyph, { glyph: q.glyph })), h("span", { className: "qh-piece__name" }, q.name));
    }));
  }
  function SizeSlider(p) {
    var id = useId(), min = p.min != null ? p.min : 1, max = p.max != null ? p.max : 5, fmtv = p.format || function (v) { return ["XS", "S", "M", "L", "XL"][v - 1] || v; };
    var c = useCtl(p.value, p.defaultValue != null ? p.defaultValue : 3, p.onChange);
    return h("div", { className: cx("qh-slider", p.className) }, h("label", { className: "qh-label", htmlFor: id, style: { color: "var(--text)" } }, p.label || "Size"),
      h("input", { id: id, type: "range", min: min, max: max, step: p.step || 1, value: c[0], "aria-valuetext": String(fmtv(c[0])), onChange: function (e) { c[1](Number(e.target.value)); } }),
      h("span", { className: "qh-slider__val", "aria-hidden": "true" }, fmtv(c[0])));
  }
  function ShutterButton(p) { return h("button", Object.assign({ type: "button", className: cx("qh-shutter", p.className), "aria-label": p.label || "Take snapshot", onClick: p.onCapture, disabled: p.disabled }, st(p.state))); }
  function ARControlRail(p) {
    return h("div", { className: cx("qh-rail", p.className), role: "region", "aria-label": "Try-on controls" },
      h(PieceCarousel, { pieces: p.pieces, value: p.piece, defaultValue: p.defaultPiece, onChange: p.onPieceChange }),
      h("div", { className: "qh-rail__row qh-rail__row--center" },
        h(SwatchGroup, { kind: "stone", value: p.stone, defaultValue: p.defaultStone || "ruby", onChange: p.onStoneChange, unavailable: p.unavailableStones })),
      h("div", { className: "qh-rail__row" },
        h(SwatchGroup, { kind: "metal", value: p.metal, defaultValue: p.defaultMetal || "yellow", onChange: p.onMetalChange }),
        h("span", { className: "qh-rail__div", "aria-hidden": "true" }),
        h(SizeSlider, { value: p.size, defaultValue: p.defaultSize, onChange: p.onSizeChange, min: p.sizeMin, max: p.sizeMax, format: p.formatSize })),
      h("div", { className: "qh-rail__foot" }, h("span", { className: "qh-rail__side" }, p.leading || null), h(ShutterButton, { onCapture: p.onCapture }), h("span", { style: { justifySelf: "end" } }, p.trailing || null)));
  }

  /* ---------- AccessGate ---------- */
  function AccessGate(p) {
    var codeS = useState(p.defaultCode || ""), code = codeS[0];
    return h("main", { className: cx("qh-gate", p.className) },
      h("div", null, h("div", { className: "qh-gate__atelier" }, p.atelier || "Atelier"), h("div", { className: "qh-gate__rule", "aria-hidden": "true" }, h(Icon, { name: "diamond", size: 10, strokeWidth: 1.5 }))),
      h("form", { className: "qh-gate__main", onSubmit: function (e) { e.preventDefault(); if (p.onSubmit) p.onSubmit(code); } },
        p.accent === false ? null : h("div", { className: "qh-gate__accent", lang: "hi" }, p.accent || "स्वागत", h("span", { lang: "en" }, "Welcome")),
        h("h1", { className: "qh-gate__title" }, p.title || "A private viewing"),
        h("p", { className: "qh-gate__lead" }, p.lead || "Enter the access code from your invitation to see the collection and try pieces on."),
        h(TextField, { label: "Access code", value: code, onChange: function (e) { codeS[1](e.target.value.toUpperCase()); }, autoComplete: "one-time-code", autoCapitalize: "characters", spellCheck: false, placeholder: "e.g. LUMEN24", inputClassName: "qh-gate__code", error: p.error, hint: p.error ? undefined : "Six to eight letters or numbers." }),
        h(Button, { type: "submit", block: true, disabled: p.busy || code.length < 4, icon: "arrow-right" }, p.busy ? "Checking…" : "Enter"),
        h("div", { style: { textAlign: "center", paddingTop: 8 } }, h(TextLink, { href: p.requestHref || "#", onClick: p.onRequest }, "Request an invitation"))),
      h("footer", { className: "qh-gate__foot" }, h("span", { className: "qh-gate__tag" }, "Wear it before it’s made."), h("span", { className: "qh-demo__cap" }, "By appointment · Lumen")));
  }


  /* ---------- Lumen identity: lockup + monogram (paths outlined from Cormorant SC 500) ---------- */
  var LUMEN_WORD = "M9.92 -0.72H11.88Q14 -0.72 15.46 -2.08Q16.92 -3.44 17.52 -5.8Q17.52 -5.88 17.76 -5.86Q18 -5.84 18 -5.76Q17.72 -3.84 17.72 -0.6Q17.72 -0.28 17.58 -0.14Q17.44 0 17.08 0H1.32Q1.24 0 1.24 -0.24Q1.24 -0.48 1.32 -0.48Q2.56 -0.48 3.12 -0.68Q3.68 -0.88 3.88 -1.46Q4.08 -2.04 4.08 -3.24V-15.48Q4.08 -16.68 3.88 -17.24Q3.68 -17.8 3.1 -18.02Q2.52 -18.24 1.32 -18.24Q1.24 -18.24 1.24 -18.48Q1.24 -18.72 1.32 -18.72L3.16 -18.68Q4.76 -18.6 5.64 -18.6Q6.6 -18.6 8.2 -18.68L9.96 -18.72Q10.04 -18.72 10.04 -18.48Q10.04 -18.24 9.96 -18.24Q8.68 -18.24 8.08 -18.02Q7.48 -17.8 7.26 -17.22Q7.04 -16.64 7.04 -15.44V-3.4Q7.04 -2.28 7.26 -1.72Q7.48 -1.16 8.08 -0.94Q8.68 -0.72 9.92 -0.72Z M47 -18.24Q46.88 -18.24 46.88 -18.48Q46.88 -18.72 47 -18.72L48.56 -18.68Q49.84 -18.6 50.6 -18.6Q51.2 -18.6 52.4 -18.68L53.92 -18.72Q54 -18.72 54 -18.48Q54 -18.24 53.92 -18.24Q52.32 -18.24 51.7 -17.44Q51.08 -16.64 51.08 -14.6V-7.36Q51.08 -3.64 49 -1.56Q46.92 0.52 43.44 0.52Q41.2 0.52 39.34 -0.38Q37.48 -1.28 36.38 -2.96Q35.28 -4.64 35.28 -6.96V-15.48Q35.28 -16.68 35.08 -17.24Q34.88 -17.8 34.28 -18.02Q33.68 -18.24 32.44 -18.24Q32.32 -18.24 32.32 -18.48Q32.32 -18.72 32.44 -18.72L34.28 -18.68Q35.72 -18.6 36.64 -18.6Q37.68 -18.6 39.2 -18.68L41 -18.72Q41.08 -18.72 41.08 -18.48Q41.08 -18.24 41 -18.24Q39.76 -18.24 39.16 -18Q38.56 -17.76 38.34 -17.18Q38.12 -16.6 38.12 -15.4V-8Q38.12 -4.36 39.9 -2.6Q41.68 -0.84 44.44 -0.84Q47.12 -0.84 48.66 -2.5Q50.2 -4.16 50.2 -7.28V-14.6Q50.2 -16.64 49.5 -17.44Q48.8 -18.24 47 -18.24Z M71.64 -17.84 72.44 -17.72 72.08 -4.56Q72.04 -2.36 72.66 -1.42Q73.28 -0.48 74.8 -0.48Q74.92 -0.48 74.92 -0.24Q74.92 0 74.8 0Q73.92 0 73.44 -0.04L71.64 -0.08L69.88 -0.04Q69.36 0 68.4 0Q68.32 0 68.32 -0.24Q68.32 -0.48 68.4 -0.48Q69.88 -0.48 70.54 -1.42Q71.2 -2.36 71.28 -4.56ZM93.52 0Q92.4 0 91.76 -0.04L89.4 -0.08L86.68 -0.04Q86 0 84.8 0Q84.72 0 84.72 -0.24Q84.72 -0.48 84.8 -0.48Q86.16 -0.48 86.82 -0.7Q87.48 -0.92 87.7 -1.48Q87.92 -2.04 87.88 -3.24L87.28 -17.48L88.12 -18.24L80.64 -0.28Q80.56 -0.12 80.36 -0.12Q80.12 -0.12 80.04 -0.28L72.36 -15.4Q70.92 -18.24 68.64 -18.24Q68.56 -18.24 68.56 -18.48Q68.56 -18.72 68.64 -18.72L71.2 -18.68L73.28 -18.72Q73.8 -18.72 74.14 -18.34Q74.48 -17.96 75.16 -16.64L81.64 -3.84L80.32 -1.4L87.08 -17.72Q87.24 -18.16 87.6 -18.44Q87.96 -18.72 88.32 -18.72L90.52 -18.68L93.32 -18.72Q93.4 -18.72 93.4 -18.48Q93.4 -18.24 93.32 -18.24Q91.64 -18.24 90.94 -17.7Q90.24 -17.16 90.32 -15.56L90.84 -3.24Q90.92 -2 91.12 -1.44Q91.32 -0.88 91.84 -0.68Q92.36 -0.48 93.52 -0.48Q93.6 -0.48 93.6 -0.24Q93.6 0 93.52 0Z M108.8 -0.48Q110.08 -0.48 110.66 -0.68Q111.24 -0.88 111.46 -1.46Q111.68 -2.04 111.68 -3.24V-15.48Q111.68 -16.68 111.46 -17.24Q111.24 -17.8 110.64 -18.02Q110.04 -18.24 108.8 -18.24Q108.72 -18.24 108.72 -18.48Q108.72 -18.72 108.8 -18.72H122.88Q123.28 -18.72 123.28 -18.4L123.32 -15.92Q123.36 -15.16 123.36 -14Q123.36 -13.88 123.12 -13.88Q122.88 -13.88 122.88 -14Q122.52 -15.84 121.22 -17.02Q119.92 -18.2 118.24 -18.2H117.36Q116.16 -18.2 115.58 -17.98Q115 -17.76 114.8 -17.2Q114.6 -16.64 114.6 -15.44V-3.4Q114.6 -2.24 114.8 -1.66Q115 -1.08 115.58 -0.86Q116.16 -0.64 117.36 -0.64H118.84Q120.56 -0.64 122 -1.96Q123.44 -3.28 124 -5.32Q124.04 -5.44 124.26 -5.44Q124.48 -5.44 124.48 -5.32Q124.2 -2.44 124.2 -0.6Q124.2 -0.28 124.08 -0.14Q123.96 0 123.6 0H108.8Q108.72 0 108.72 -0.24Q108.72 -0.48 108.8 -0.48ZM113.36 -9.08V-10Q117.76 -10 119.4 -10.2Q121.04 -10.4 121.24 -10.4Q121.48 -10.4 121.48 -9.52Q121.48 -8.6 121.24 -8.6Q121.08 -8.6 119.44 -8.84Q117.8 -9.08 113.36 -9.08Z M142.72 -17.84 143.48 -17.72V-4.56Q143.48 -2.36 144.12 -1.42Q144.76 -0.48 146.28 -0.48Q146.4 -0.48 146.4 -0.24Q146.4 0 146.28 0Q145.4 0 144.92 -0.04L143.12 -0.08L141.36 -0.04Q140.84 0 139.88 0Q139.76 0 139.76 -0.24Q139.76 -0.48 139.88 -0.48Q141.4 -0.48 142.06 -1.42Q142.72 -2.36 142.72 -4.56ZM157.28 0.52 143.8 -15.44Q142.52 -16.96 141.58 -17.6Q140.64 -18.24 139.76 -18.24Q139.68 -18.24 139.68 -18.48Q139.68 -18.72 139.76 -18.72L142 -18.68Q142.4 -18.68 142.92 -18.7Q143.44 -18.72 144.6 -18.72Q144.92 -18.72 145.14 -18.52Q145.36 -18.32 145.72 -17.8Q145.88 -17.56 146.56 -16.64L157.32 -3.76L157.76 0.44Q157.76 0.52 157.56 0.56Q157.36 0.6 157.28 0.52ZM157.76 0.44 156.96 -0.8V-14.12Q156.96 -16.36 156.32 -17.3Q155.68 -18.24 154.16 -18.24Q154.08 -18.24 154.08 -18.48Q154.08 -18.72 154.16 -18.72L155.56 -18.68Q156.68 -18.6 157.32 -18.6Q158 -18.6 159.12 -18.68L160.64 -18.72Q160.72 -18.72 160.72 -18.48Q160.72 -18.24 160.64 -18.24Q159.12 -18.24 158.44 -17.28Q157.76 -16.32 157.76 -14.12Z", LUMEN_W = 161.56, LUMEN_XH = 18.72, WIRE_H = "M-6 9 C45.24 15 116.32 15 173.56 4 C181.56 -2 181.56 -14 174.06 -15.5 C168.06 -16.5 166.56 -9 171.56 -8 C175.56 -7.3 176.06 -12 173.06 -12.3", WIRE_S = "M-50.08 16 C-32.05 -2 32.05 -2 50.08 13 C53.08 19 49.08 25 44.08 23.5 C40.08 22 41.08 16.5 45.08 17.5 C47.58 18.2 47.08 21 45.08 20.8";
  function LumenLockup(p) {
    var stacked = p.layout === "stacked", h1 = p.height || 40, word = h("path", { d: LUMEN_WORD, fill: "currentColor" });
    var wire = function (d) { return h("path", { d: d, fill: "none", stroke: "var(--control-line)", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: p.nonScaling ? "non-scaling-stroke" : undefined }); };
    var W = LUMEN_W, svg;
    if (stacked) {
      var vbw = W + 24, vbh = 30 + LUMEN_XH + 4;
      svg = h("svg", { viewBox: "0 0 " + vbw.toFixed(1) + " " + vbh.toFixed(1), height: h1 * 1.6, "aria-hidden": "true", className: "qh-lockup__mark" },
        h("g", { transform: "translate(" + (vbw / 2) + " 2)" }, wire(WIRE_S)), h("g", { transform: "translate(" + ((vbw - W) / 2) + " " + (30 + LUMEN_XH) + ")" }, word));
    } else {
      var hvbw = W + 34, hvbh = LUMEN_XH + 22;
      svg = h("svg", { viewBox: "0 0 " + hvbw.toFixed(1) + " " + hvbh.toFixed(1), height: h1, "aria-hidden": "true", className: "qh-lockup__mark" },
        h("g", { transform: "translate(7 " + (LUMEN_XH + 3) + ")" }, word, wire(WIRE_H)));
    }
    var line = p.atelier ? (p.prefix === false ? p.atelier : (p.prefix || "for") + " " + p.atelier) : null;
    return h("span", { className: cx("qh-lockup", stacked && "qh-lockup--stacked", p.className), role: "img", "aria-label": "Lumen" + (line ? " " + line : "") },
      svg, line ? h("span", { className: "qh-lockup__line", "aria-hidden": "true" }, line) : null);
  }
  function LumenMonogram(p) {
    var size = p.size || 32, small = size <= 20, col = "var(--control-line)";
    var inner = small
      ? [h("path", { key: "l", d: "M5.75 2.75V10.5A2.5 2.5 0 0 0 8.25 13H10.5", strokeWidth: 1.5 }), h("circle", { key: "s", cx: 12.25, cy: 13, r: 1.6, strokeWidth: 1.25 })]
      : [h("g", { key: "g", transform: "translate(-2 -0.6)" }, h("path", { d: "M9.5 8C9.5 6 12 5.5 12 7.5V21A4 4 0 0 0 16 25H21.5", strokeWidth: 1.5 }), h("circle", { cx: 24, cy: 25, r: 2.5, strokeWidth: 1.5 }))];
    return h("svg", { className: cx("qh-monogram", p.className), width: size, height: size, viewBox: small ? "0 0 16 16" : "0 0 32 32", fill: "none", stroke: col, strokeLinecap: "round", strokeLinejoin: "round", role: "img", "aria-label": p.title || "Lumen" }, inner);
  }

  var api = { Button: Button, TextLink: TextLink, FilterChip: FilterChip, SegmentedControl: SegmentedControl, StoneSwatch: StoneSwatch, MetalSwatch: MetalSwatch, SwatchGroup: SwatchGroup, Stepper: Stepper, TextField: TextField, Select: Select, ConsentCheckbox: ConsentCheckbox, BottomSheet: BottomSheet, Modal: Modal, Toast: Toast, PricePill: PricePill, SpecTable: SpecTable, SlotPicker: SlotPicker, RoughPreviewBadge: RoughPreviewBadge, TrackingPill: TrackingPill, ARTopBar: ARTopBar, PieceCarousel: PieceCarousel, SizeSlider: SizeSlider, ShutterButton: ShutterButton, ARControlRail: ARControlRail, AccessGate: AccessGate, LumenLockup: LumenLockup, LumenMonogram: LumenMonogram, Icon: Icon, ICON_NAMES: Object.keys(P), PieceGlyph: PieceGlyph, GemArt: GemArt, PIECES: PIECES, GEMS: GEMS, METALS: METALS };
  window.QuietHeritage = Object.assign(window.QuietHeritage || {}, api);
})();
