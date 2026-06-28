import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Testing on: {device}")

# Model Configuration from notebook
CFG_IMG_SIZE = 224
CFG_CNN_DIM = 512
CFG_VIT_DIM = 512
CFG_FUSED_DIM = 1024
CFG_CTAF_DIM = 256
CFG_META_DIM = 3
CFG_DROPOUT = 0.4
CFG_N_STAGES = 4
CFG_N_ZONES = 3
CFG_N_PLUS = 2

# Clinical Averages for Normalisation
GA_MEAN, GA_STD = 28.5, 3.0
BW_MEAN, BW_STD = 1100.0, 350.0
SEX_MEAN, SEX_STD = 0.5, 0.5

class DualStreamBackbone(nn.Module):
    def __init__(self):
        super().__init__()
        eff = models.efficientnet_b3(weights=None)
        in_eff = eff.classifier[1].in_features
        eff.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_eff, CFG_CNN_DIM),
            nn.GELU()
        )
        self.cnn = eff

        swin = models.swin_t(weights=None)
        in_swin = swin.head.in_features
        swin.head = nn.Sequential(
            nn.Linear(in_swin, CFG_VIT_DIM),
            nn.GELU(),
            nn.Dropout(0.3)
        )
        self.vit = swin

        self.norm = nn.LayerNorm(CFG_FUSED_DIM)

    def forward(self, x):
        f_cnn = self.cnn(x)
        f_vit = self.vit(x)
        return self.norm(torch.cat([f_cnn, f_vit], dim=1)), f_cnn, f_vit

class CTAFModule(nn.Module):
    def __init__(self, dim=CFG_CTAF_DIM):
        super().__init__()
        self.scale  = dim ** -0.5
        self.norm_s = nn.LayerNorm(dim)
        self.norm_z = nn.LayerNorm(dim)
        self.norm_p = nn.LayerNorm(dim)

    def _attend(self, q, keys):
        K = torch.stack(keys, dim=1)
        w = F.softmax(torch.bmm(q.unsqueeze(1),
                      K.transpose(1,2)) * self.scale, dim=-1)
        return torch.bmm(w, K).squeeze(1)

    def forward(self, Hs, Hz, Hp):
        return (self.norm_s(Hs + self._attend(Hs, [Hz, Hp])),
                self.norm_z(Hz + self._attend(Hz, [Hs, Hp])),
                self.norm_p(Hp + self._attend(Hp, [Hs, Hz])))

class MetadataGate(nn.Module):
    def __init__(self, feat_dim=CFG_CTAF_DIM, meta_dim=CFG_META_DIM):
        super().__init__()
        self.gate      = nn.Sequential(
            nn.Linear(feat_dim + meta_dim, feat_dim), nn.Sigmoid())
        self.meta_proj = nn.Sequential(
            nn.Linear(meta_dim, feat_dim), nn.GELU())
        self.norm = nn.LayerNorm(feat_dim)

    def forward(self, feat, meta):
        g = self.gate(torch.cat([feat, meta], dim=1))
        return self.norm(g * feat + (1-g) * self.meta_proj(meta))

class MTL_CTAF_ROP(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone   = DualStreamBackbone()
        proj = lambda: nn.Sequential(
            nn.Linear(CFG_FUSED_DIM, 512), nn.GELU(), nn.Dropout(CFG_DROPOUT),
            nn.Linear(512, CFG_CTAF_DIM),  nn.GELU())
        self.proj_s     = proj()
        self.proj_z     = proj()
        self.proj_p     = proj()
        self.ctaf       = CTAFModule()
        self.gate_s     = MetadataGate()
        self.gate_z     = MetadataGate()
        self.gate_p     = MetadataGate()
        self.drop       = nn.Dropout(CFG_DROPOUT)
        self.clf_stage  = nn.Linear(CFG_CTAF_DIM, CFG_N_STAGES)
        self.clf_zone   = nn.Linear(CFG_CTAF_DIM, CFG_N_ZONES)
        self.clf_plus   = nn.Linear(CFG_CTAF_DIM, CFG_N_PLUS)

    def forward(self, x, meta):
        fused, _, _ = self.backbone(x)
        Hs = self.proj_s(fused)
        Hz = self.proj_z(fused)
        Hp = self.proj_p(fused)
        Fs, Fz, Fp = self.ctaf(Hs, Hz, Hp)
        Fs = self.gate_s(self.drop(Fs), meta)
        Fz = self.gate_z(self.drop(Fz), meta)
        Fp = self.gate_p(self.drop(Fp), meta)
        return (self.clf_stage(self.drop(Fs)),
                self.clf_zone(self.drop(Fz)),
                self.clf_plus(self.drop(Fp)))

print("Loading model architecture...")
model = MTL_CTAF_ROP().to(device)

print("Loading best.pth...")
ckpt = torch.load('best.pth', map_location=device, weights_only=True)
model.load_state_dict(ckpt['model'])
model.eval()

# Dummy raw inputs
raw_ga = 27.5
raw_bw = 1050.0
raw_sex = 0.0 # Male

# Scale
ga_scaled = (raw_ga - GA_MEAN) / GA_STD
bw_scaled = (raw_bw - BW_MEAN) / BW_STD
sex_scaled = (raw_sex - SEX_MEAN) / SEX_STD

print(f"Scaled Meta: GA={ga_scaled:.3f}, BW={bw_scaled:.3f}, Sex={sex_scaled:.3f}")

dummy_img = torch.randn(1, 3, CFG_IMG_SIZE, CFG_IMG_SIZE).to(device)
dummy_meta = torch.tensor([[ga_scaled, bw_scaled, sex_scaled]], dtype=torch.float32).to(device)

with torch.no_grad():
    ls, lz, lp = model(dummy_img, dummy_meta)

stage_prob = F.softmax(ls, dim=1)
zone_prob = F.softmax(lz, dim=1)
plus_prob = F.softmax(lp, dim=1)

print("\n--- INFERENCE SUCCESSFUL ---")
print(f"Stage Probabilities: {stage_prob.cpu().numpy()}")
print(f"Zone Probabilities: {zone_prob.cpu().numpy()}")
print(f"Plus Probabilities: {plus_prob.cpu().numpy()}")
print("----------------------------")
