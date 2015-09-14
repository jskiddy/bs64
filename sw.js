var FILES = [
        '/bs64/',
        '/bs64/bs64.js',
        '/bs64/bs64.css',
        '/bs64/index.html'
    ],
    PREFIX = 'bs64',
    VERSION = 'ver1',
    CACHENAME = PREFIX + VERSION;

this.addEventListener('fetch', function (event) {
    event.respondWith(
        caches
            .match(event.request)
            .catch(function () {
                return fetch(event.request);
            })
            .then(function (response) {
                caches
                    .open(CACHENAME)
                    .then(function (cache) {
                        cache.put(event.request, response.clone());
                    });

                return response;
            })
    );
});

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
                    } else {
                        return Promise.resolve();
                    }
                }));
            })
    );
});