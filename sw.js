var FILES = [
        '/bs64/',
        '/bs64/bs64.js',
        '/bs64/bs64.css',
        '/bs64/index.html'
    ],
    PREFIX = 'bs64',
    VERSION = 'ver3',
    CACHENAME = PREFIX + VERSION;

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

this.addEventListener('fetch', function (event) {
    event.respondWith(
        caches
            .match(event.request)
            .catch(function () {
                return fetch(event.request);
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