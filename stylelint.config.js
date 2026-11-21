// Stylelint over the theme's CSS (src/theme.css) and the <style> blocks of its Vue files: the fleet config (no hex colours, token-only colour and z-index,
// accessibility rules, browser support against the shared browserslist). theme.css holds only roles and mixes of roles, so the colour rules apply in full.
import { stylelintConfig } from '@meddleware/frontend-config/stylelint'

export default stylelintConfig()
