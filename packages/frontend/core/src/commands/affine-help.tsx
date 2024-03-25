import type { useAFFiNEI18N } from '@affine/i18n/hooks';
import { ContactWithUsIcon, NewIcon } from '@blocksuite/icons';
import { registerAffineCommand } from '@toeverything/infra';
import type { createStore } from 'jotai';

import { openSettingModalAtom } from '../atoms';

export function registerAffineHelpCommands({
  t,
  store,
}: {
  t: ReturnType<typeof useAFFiNEI18N>;
  store: ReturnType<typeof createStore>;
}) {
  const unsubs: Array<() => void> = [];
  unsubs.push(
    registerAffineCommand({
      id: 'affine:help-whats-new',
      category: 'affine:help',
      icon: <NewIcon />,
      label: t['com.affine.cmdk.affine.whats-new'](),
      run() {
        window.open(runtimeConfig.changelogUrl, '_blank');
      },
    })
  );
  unsubs.push(
    registerAffineCommand({
      id: 'affine:help-contact-us',
      category: 'affine:help',
      icon: <ContactWithUsIcon />,
      label: t['com.affine.cmdk.affine.contact-us'](),
      run() {
        store.set(openSettingModalAtom, {
          open: true,
          activeTab: 'about',
          workspaceMetadata: null,
        });
      },
    })
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
