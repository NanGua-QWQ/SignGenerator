import {
  forwardRef,
} from 'react'
import type {
  ComponentProps,
  ElementRef,
} from 'react'

import {
  TextField,
} from '@radix-ui/themes'

type InputProps = ComponentProps<typeof TextField.Root> & {
  defaultValue?: string | number | undefined
}

const Input = forwardRef<ElementRef<typeof TextField.Root>, InputProps>(function Input(props, ref) {
  // TextField.Root 内部渲染的 input 自带 rt-TextFieldInput 类,
  // 其余属性（id/placeholder/value/onChange/className 等）透传给该 input。
  return <TextField.Root {...props} ref={ref} />
})

export {
  Input,
}
