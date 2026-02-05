declare module '@met4citizen/talkinghead' {
  interface TalkingHeadOptions {
    ttsEndpoint?: string | null
    cameraView?: string
    cameraRotateEnable?: boolean
    cameraZoomEnable?: boolean
    cameraPanEnable?: boolean
    lightAmbientColor?: number
    lightAmbientIntensity?: number
    lightDirectColor?: number
    lightDirectIntensity?: number
  }

  interface AvatarSource {
    url: string
  }

  interface ShowAvatarOptions {
    avatarMood?: string
    avatarMute?: boolean
  }

  export class TalkingHead {
    constructor(container: HTMLElement, options?: TalkingHeadOptions)
    showAvatar(source: AvatarSource, options?: ShowAvatarOptions): Promise<void>
    speakText(text: string): Promise<void>
    speakAudio(audioBuffer: AudioBuffer): Promise<void>
    stop(): void
    close?(): void
  }
}
