import { onMounted, shallowReactive } from 'vue';
import { browser } from 'wxt/browser';
export const useHasPermissions = (permissions: string[]) => {
  const hasPermissions = shallowReactive<Record<string, boolean>>({});
  const handlePermission = (name: string, status: boolean) => {
    hasPermissions[name] = status;
  };
  const request = (needReload = false) => {
    const reqPermissions = permissions.filter(
      (permission) => !hasPermissions[permission]
    );
    browser.permissions
      .request({ permissions: reqPermissions as chrome.runtime.ManifestPermission[] })
      .then((status) => {
        if (!status) return;
        reqPermissions.forEach((permission) => {
          handlePermission(permission, true);
        });
        if (typeof needReload === 'boolean' && needReload) {
          alert('Browsless needs to reload to make this feature work');
          browser.runtime.reload();
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };
  onMounted(() => {
    permissions.forEach((permission) => {
      browser.permissions
        .contains({ permissions: [permission as chrome.runtime.ManifestPermission] })
        .then((status) => {
          handlePermission(permission, status);
        });
    });
  });
  return {
    request,
    has: hasPermissions,
  };
};
