var FILES = [
        '/bs64/',
        '/bs64/bs64.js',
        '/bs64/icon.png',
        '/bs64/bs64.css',
        '/bs64/index.html',
        '/bs64/manifest.json',
        new Request('https://fonts.googleapis.com/css?family=Open+Sans&subset=latin,cyrillic', {mode: 'no-cors'})
    ],
    PREFIX = 'bs64',
    VERSION = 'ver7',
    CACHENAME = PREFIX + VERSION,
    ALLOWED_HOSTS = [
        'fonts.gstatic.com'
    ];

Cache.prototype.addAll =
Cache.prototype.addAll || function addAll(requests) {
    var cache = this;

    return Promise
        .resolve()
        .then(function () {
            return Promise.all(
                requests.map(function (request) {
                    if (!(request instanceof Request)) {
                        request = new Request(String(request));
                    }

                    return fetch(request.clone());
                })
            );
        })
        .then(function (responses) {
            return Promise.all(
                responses.map(function (response, i) {
                    return cache.put(requests[i], response);
                })
            );
        })
        .then(function () {});
};

this.addEventListener('install', function (event) {
    event.waitUntil(
        caches
            .open(CACHENAME)
            .then(function (cache) {
                return cache.addAll(FILES);
            })
    );
});

this.addEventListener('activate', function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(keys.map(function (key) {
                    if (key !== CACHENAME && key.indexOf(PREFIX) === 0) {
                        return caches.delete(key);
                    }
                    return Promise.resolve();
                }));
            })
    );
});

this.addEventListener('fetch', function (event) {
    event.respondWith(
        caches
            .match(event.request)
            .then(function (request) {
                return request || fetch(event.request).then(function (response) {
                    var url = new URL(event.request.url);

                    if (ALLOWED_HOSTS.indexOf(url.host) >= 0) {
                        caches
                            .open(CACHENAME)
                            .then(function (cache) {
                                cache.put(event.request, response.clone());
                            });
                    }

                    return response;
                });
            })
    );
});
