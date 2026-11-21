import { defineComponentMetadata } from '@/components/define'
import { contentLoaded } from '@/core/life-cycle'
import { mountVueComponent } from '@/core/utils'
import { homeUrls } from '../urls'
import { aggregatedHomeOptionsMetadata } from './options'

let aggregatedHome: Vue | null = null

const mount = async () => {
  if (aggregatedHome) {
    return
  }
  const AggregatedHome = await import('./AggregatedHome.vue')
  aggregatedHome = mountVueComponent(AggregatedHome)
  document.body.appendChild(aggregatedHome.$el)
}

const unmount = () => {
  if (!aggregatedHome) {
    return
  }
  aggregatedHome.$destroy()
  aggregatedHome.$el.remove()
  aggregatedHome = null
}

export const component = defineComponentMetadata({
  name: 'aggregatedHome',
  displayName: '聚合首页',
  urlInclude: homeUrls,
  tags: [componentsTags.style],
  author: {
    name: 'jade zhou',
    link: 'https://github.com/jadezhouu',
  },
  entry: () => {
    contentLoaded(mount)
  },
  options: aggregatedHomeOptionsMetadata,
  extraOptions: () => import('./ExtraOptions.vue'),
  unload: () => {
    document.body.classList.add('home-redesign-off')
    unmount()
  },
  reload: () => {
    document.body.classList.remove('home-redesign-off')
    mount().catch(console.error)
  },
  instantStyles: [
    {
      name: 'aggregated-home-hide-original',
      style: () => import('../hide-original.scss'),
    },
  ],
})
