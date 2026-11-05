// Serves foo.html at its own address, with no redirect, as the site's links and canonical tags expect.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/(index)?\.html$/, "");
    return env.ASSETS.fetch(new Request(url, request));
  },
};
