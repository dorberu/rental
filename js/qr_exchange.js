function deflate_obj(obj) {
  var utf16 = JSON.stringify(obj);
  var utf8 = encodeURIComponent(utf16);
  var raw = zip_deflate(utf8);
  var base64 = btoa(raw);
  return base64;
}

function inflate_obj(base64) {
  var raw = atob(base64);
  var utf8 = zip_inflate(raw);
  var utf16 = decodeURIComponent(utf8);
  var obj = JSON.parse(utf16);
  return obj;
}

function createMultiQR(obj, qr_id, length) {
  var base64 = deflate_obj(obj);

  var data_list = [];
  for (var i = 0; i < base64.length; i += length) {
    data_list.push(base64.slice(i, i + length));
  }

  var idx = 0;
  var task = function () {
    $('#' + qr_id).empty();
    if (idx < 0) {
      return;
    }
    setTimeout(task, 100 + Math.random() * 400);

    $('#' + qr_id).empty().qrcode({
      render: 'image',
      size: 400,
      text: idx + "_" + data_list.length + ":" + data_list[idx]
    });

    ++idx;
    if (idx >= data_list.length) {
      idx = 0;
    }
  }

  task();

  return function () {
    idx = -1;
  }
}

function startReadQR(video, callback, error) {
  var store = {
    all_length: 0,
    length: 0
  };

  var state = "run";

  qrcode.callback = function (res) {
    if (res == 'error decoding QR Code') {
      error();
    } else {
      console.log("read", res);
      receiveQr(res, store, callback);
    }
  }

  var videoRead = function () {
    var w = video.videoWidth;
    var h = video.videoHeight;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    var draw = function () {
      if (state == "stop") {
        return;
      }

      requestAnimationFrame(draw);
      ctx.drawImage(video, 0, 0, w, h);
      var img = canvas.toDataURL("image/png");
      qrcode.decode(img);
    };

    draw();
  }

  if (video.readyState == 0) {
    video.onloadedmetadata = videoRead;
  } else {
    videoRead();
  }

  return function () {
    state = "stop";
  };
}

function receiveQr(data, store, callback) {
  var idx = data.slice(0, data.indexOf("_"))
  var len = data.slice(data.indexOf("_") + 1, data.indexOf(":"));
  if (store.all_length != len) {
    for (var k in store) {
      delete store[k];
    }
    store.all_length = Number(len);
    store.length = 0;
  }
  if (!store[idx]) {
    store[idx] = data.slice(data.indexOf(":") + 1);
    store.length++;
  }
  console.log("receive " + idx + " / " + len, store);
  if (store.length == store.all_length) {
    var d = "";
    for (var i = 0; i < store.all_length; ++i) {
      d += store[i];
    }
    var obj = inflate_obj(d);
    callback(obj);
  }
}