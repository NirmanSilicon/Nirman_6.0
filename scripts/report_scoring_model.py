"""Reproduce UQUAL scoring-model evidence from a completed training artifact.

The learning curve uses uncalibrated booster probabilities on the frozen train
and validation partitions. The independent cohort uses a different random seed
from the same simulator and is never used for fitting or tuning.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import log_loss, roc_curve, precision_recall_curve
from uqual.model import calibrated, metrics

NAVY='#10243F'; TEAL='#418F91'; BLUE='#4774EE'; GREY='#A8B6C9'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--artifact', type=Path, default=Path('artifacts/synthetic-india-v2'))
    parser.add_argument('--out', type=Path, default=Path('artifacts/model-evidence-20261129'))
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    bundle=joblib.load(args.artifact/'model.joblib')
    meta=json.loads((args.artifact/'metrics.json').read_text())
    frame=pd.read_parquet('data/synthetic/india-v1/features_monotone_v2.parquet').set_index('assessment_id')
    assignments=pd.read_csv(args.artifact/'split_assignments.csv').set_index('assessment_id')
    raw=bundle['pipeline']; model=raw.named_steps['model']; n=model.n_estimators
    curve=[]
    subsets={}
    for split in ('train','validation'):
        ids=assignments.index[assignments.partition.eq(split)]
        part=frame.loc[ids]
        X=part[bundle['features']]
        X=raw.named_steps['clipper'].transform(X)
        X=raw.named_steps['imputer'].transform(X)
        subsets[split]=(X,part.target.to_numpy())
    for iteration in list(range(1,n+1,5))+([n] if n%5 else []):
        row={'trees':iteration}
        for split,(X,y) in subsets.items():
            p=model.predict_proba(X,iteration_range=(0,iteration))[:,1]
            row[split+'_log_loss']=float(log_loss(y,p,labels=[0,1]))
        curve.append(row)
    pd.DataFrame(curve).to_csv(args.out/'learning_curve.csv',index=False)
    independent=pd.read_parquet('data/synthetic/india-v2-evaluation/features_monotone_v2.parquet')
    independent=independent[independent.eligible].copy()
    y=independent.target.to_numpy(); p=calibrated(bundle,independent)
    result=metrics(y,p,bundle['threshold'])
    pd.DataFrame({'assessment_id':independent.assessment_id,'target':y,'probability':p}).to_csv(args.out/'independent_predictions.csv',index=False)
    report={'scope':'Different-seed cohort from the same synthetic generator; no real repayment validation',
            'model_sha256':hashlib.sha256((args.artifact/'model.joblib').read_bytes()).hexdigest(),
            'model_name':bundle['model_name'],'feature_count':len(bundle['features']),
            'development_profiles':meta['data_summary']['borrowers'],
            'development_transactions':meta['data_summary']['transactions'],
            'partitions':meta['partitions'],'test':meta['test'],
            'test_baseline':{k:meta['majority_baseline'][k] for k in ('roc_auc','pr_auc','brier','log_loss')},
            'independent_same_simulator':result}
    (args.out/'benchmark.json').write_text(json.dumps(report,indent=2,default=str))
    plt.rcParams.update({'font.family':'DejaVu Sans','axes.spines.top':False,'axes.spines.right':False,'font.size':11})
    fig,axs=plt.subplots(2,2,figsize=(13,9),constrained_layout=True)
    fig.patch.set_facecolor('white')
    ax=axs[0,0]; curve_df=pd.DataFrame(curve)
    ax.plot(curve_df.trees,curve_df.train_log_loss,color=BLUE,label='Train')
    ax.plot(curve_df.trees,curve_df.validation_log_loss,color=TEAL,label='Validation')
    ax.set(title='Boosting loss by tree',xlabel='Trees',ylabel='Log loss');ax.legend(frameon=False);ax.grid(alpha=.15)
    ax=axs[0,1]
    labels=['ROC AUC','PR AUC']; vals=[result['roc_auc'],result['pr_auc']]
    base=[.5,float(np.mean(y))]
    x=np.arange(2);width=.33
    ax.bar(x-width/2,vals,width,color=TEAL,label='Model');ax.bar(x+width/2,base,width,color=GREY,label='Constant baseline')
    ax.set_xticks(x,labels);ax.set_ylim(0,1);ax.set(title='Different-seed cohort · same simulator',ylabel='Score');ax.legend(frameon=False)
    ax=axs[1,0];fpr,tpr,_=roc_curve(y,p);ax.plot(fpr,tpr,color=BLUE,lw=2,label=f"AUC {result['roc_auc']:.3f}");ax.plot([0,1],[0,1],ls='--',color=GREY)
    ax.set(title='ROC curve · different seed',xlabel='False positive rate',ylabel='True positive rate');ax.legend(frameon=False);ax.grid(alpha=.15)
    ax=axs[1,1];precision,recall,_=precision_recall_curve(y,p);ax.plot(recall,precision,color=TEAL,lw=2,label=f"AP {result['pr_auc']:.3f}");ax.axhline(np.mean(y),ls='--',color=GREY,label=f'Base rate {np.mean(y):.3f}')
    ax.set(title='Precision–recall curve · different seed',xlabel='Recall',ylabel='Precision');ax.legend(frameon=False);ax.grid(alpha=.15)
    fig.suptitle('UQUAL scoring model · measured research evidence',fontsize=18,fontweight='bold',color=NAVY)
    fig.savefig(args.out/'model_benchmark.png',dpi=180,bbox_inches='tight');fig.savefig(args.out/'model_benchmark.pdf',bbox_inches='tight');plt.close(fig)
    fig,ax=plt.subplots(figsize=(7,5)); bins=result['calibration_bins']; ax.scatter([b['predicted'] for b in bins],[b['observed'] for b in bins],s=[max(18,b['count']/4) for b in bins],color=TEAL,alpha=.8)
    ax.plot([0,1],[0,1],ls='--',color=GREY);ax.set(xlim=(0,1),ylim=(0,1),xlabel='Mean predicted probability',ylabel='Observed simulated outcome rate',title='Calibration · different-seed cohort');ax.grid(alpha=.15)
    fig.savefig(args.out/'calibration.png',dpi=180,bbox_inches='tight');plt.close(fig)
    print(json.dumps({k:result[k] for k in ('n','roc_auc','pr_auc','brier','precision','recall')},indent=2))

if __name__=='__main__':main()
