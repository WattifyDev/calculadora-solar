---
name: deploy-to-the-moon
description: Automates production deployment to Hostinger VPS (76.13.42.121) whenever the user requests "To the moon".
---

# 🚀 Deployment Skill: To the moon

Whenever the user says **"To the moon"**, **"To the moon 🚀"**, or asks to deploy to production, perform the following procedure:

1. **Verify Local Build:**
   Run `npm run build` locally to confirm 0 compilation errors.

2. **Commit Local Changes:**
   Ensure all working files are committed to Git (`git add . && git commit -m "..."`).

3. **Deploy Commands for VPS Hostinger (`76.13.42.121`):**
   Provide the single-click / SSH execution commands for `/root/calculadora`:

   ```bash
   cd /root/calculadora
   git pull origin main
   docker build -t mi-app-nextjs:latest .
   docker service update --image mi-app-nextjs:latest calculadora_app
   ```

4. **Verify Health & Notify User:**
   Remind the user of the production URL: [https://calculadora-solar.wattify.es](https://calculadora-solar.wattify.es)
